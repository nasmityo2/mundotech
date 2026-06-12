import { NextRequest, NextResponse } from 'next/server';
import {
  getCartsFor24hEmail,
  getCartsFor72hEmail,
  markCartEmailedAndRotateToken,
  refreshAbandonedCartItems,
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
      // PRD-176/PRD-181: el email se arma con precios, nombres y slugs ACTUALES
      // de BD; productos eliminados o agotados se omiten. Sin ítems vigentes no
      // se envía nada (se reintenta en la próxima corrida por si hay restock).
      const refreshed = await refreshAbandonedCartItems(cart.items);
      if (!refreshed) continue;

      const firstName = cart.email.split('@')[0] ?? 'Cliente';

      try {
        // PRD-211: marcar ANTES de enviar — si el envío falla tras marcar no se
        // duplica el email (la oleada de 72h sigue cubriendo a este carrito).
        // PRD-178: el token se genera aquí en claro y en BD solo queda su hash.
        const recoveryToken = await markCartEmailedAndRotateToken(cart.id, 'EMAILED_24H');
        await sendAbandonedCartEmail({
          email:         cart.email,
          customerName:  firstName,
          items:         refreshed.items,
          totalUsd:      refreshed.totalUsd,
          recoveryToken,
        });
        sent24h++;
      } catch (err) {
        console.error('[cron/abandoned-cart] Error enviando 24h a', cart.email, err);
        errors24++;
      }
    }

    // ── 72 h ──────────────────────────────────────────────────────────────
    const carts72h = await getCartsFor72hEmail();

    for (const cart of carts72h) {
      // PRD-176/PRD-181: mismo refresco contra catálogo que la oleada de 24h.
      const refreshed = await refreshAbandonedCartItems(cart.items);
      if (!refreshed) continue;

      const firstName = cart.email.split('@')[0] ?? 'Cliente';

      try {
        // PRD-211 + PRD-178: marcar y rotar token antes de enviar (ver oleada 24h).
        const recoveryToken = await markCartEmailedAndRotateToken(cart.id, 'EMAILED_72H');
        await sendAbandonedCartEmail({
          email:         cart.email,
          customerName:  firstName,
          items:         refreshed.items,
          totalUsd:      refreshed.totalUsd,
          recoveryToken,
        });
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
