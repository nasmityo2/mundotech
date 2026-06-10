import { NextRequest, NextResponse } from 'next/server';
import {
  getCartsFor24hEmail,
  getCartsFor72hEmail,
  markCartEmailed,
  parseAbandonedCartItems,
} from '@/lib/abandoned-cart';
import { sendAbandonedCartEmail } from '@/lib/resend';

/**
 * GET /api/cron/abandoned-cart
 *
 * Envía recordatorios de carrito abandonado en dos oleadas:
 *   - 24 h: carritos PENDING con lastActivityAt > 24 h.
 *   - 72 h: carritos EMAILED_24H con emailSentAt > 48 h adicionales.
 *
 * Protección: requiere Authorization: Bearer <CRON_SECRET>
 * (o el header x-vercel-cron si se ejecuta desde Vercel Cron).
 *
 * Variables de entorno necesarias:
 *   CRON_SECRET — token arbitrario para autenticar llamadas manuales.
 */
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // Llamada autenticada con el secreto (funciona en cualquier entorno)
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth === `Bearer ${cronSecret}`) return true;
  }

  // Header de Vercel Cron: solo es confiable cuando realmente corremos EN
  // Vercel (la plataforma lo inyecta y un cliente externo no puede llegar con
  // él sin pasar por el proxy). Fuera de Vercel, cualquiera podría enviarlo.
  if (process.env.VERCEL === '1' && req.headers.get('x-vercel-cron') === '1') {
    return true;
  }

  // Sin CRON_SECRET configurado: solo permitir en desarrollo local
  return !cronSecret && process.env.NODE_ENV === 'development';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let sent24h  = 0;
  let sent72h  = 0;
  let errors24 = 0;
  let errors72 = 0;

  try {
    // ── 24 h ──────────────────────────────────────────────────────────────
    const carts24h = await getCartsFor24hEmail();

    for (const cart of carts24h) {
      const items = parseAbandonedCartItems(cart.items);
      if (items.length === 0) continue;

      const firstName = cart.email.split('@')[0] ?? 'Cliente';

      try {
        await sendAbandonedCartEmail({
          email:         cart.email,
          customerName:  firstName,
          items,
          totalUsd:      cart.totalUsd,
          recoveryToken: cart.recoveryToken,
        });
        await markCartEmailed(cart.id, 'EMAILED_24H');
        sent24h++;
      } catch (err) {
        console.error('[cron/abandoned-cart] Error enviando 24h a', cart.email, err);
        errors24++;
      }
    }

    // ── 72 h ──────────────────────────────────────────────────────────────
    const carts72h = await getCartsFor72hEmail();

    for (const cart of carts72h) {
      const items = parseAbandonedCartItems(cart.items);
      if (items.length === 0) continue;

      const firstName = cart.email.split('@')[0] ?? 'Cliente';

      try {
        await sendAbandonedCartEmail({
          email:         cart.email,
          customerName:  firstName,
          items,
          totalUsd:      cart.totalUsd,
          recoveryToken: cart.recoveryToken,
        });
        await markCartEmailed(cart.id, 'EMAILED_72H');
        sent72h++;
      } catch (err) {
        console.error('[cron/abandoned-cart] Error enviando 72h a', cart.email, err);
        errors72++;
      }
    }

    console.log(
      `[cron/abandoned-cart] 24h: ${sent24h} enviados, ${errors24} errores | 72h: ${sent72h} enviados, ${errors72} errores`,
    );

    return NextResponse.json({
      ok:      true,
      sent24h,
      sent72h,
      errors24,
      errors72,
    });
  } catch (err) {
    console.error('[cron/abandoned-cart] Error general:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
