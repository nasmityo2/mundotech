import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin } from '@/lib/security';
import { z } from 'zod';

// PRD-183: sessionId con formato estricto (cuid/uuid/nanoid o el `${Date.now()}-${rand36}`
// del tracker propio). Nada de strings basura arbitrarios en BD.
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

const viewSchema = z.object({
  productId: z.string().min(1).max(64),
  sessionId: z.string().regex(SESSION_ID_RE, 'sessionId inválido').optional(),
});

/** Ventana de deduplicación por (sessionId, productId). */
const DEDUP_WINDOW_MS = 30 * 60_000;

/**
 * POST /api/events/view
 * Body: { productId: string; sessionId?: string }
 * Registra una vista de producto en la tabla ProductView.
 * Fire-and-forget desde el cliente — no bloquea la navegación.
 *
 * PRD-182: además del rate limit, la deduplicación fuerte se hace contra la BD
 * por (sessionId, productId) — funciona entre instancias serverless — y solo se
 * registran vistas con sessionId válido. El ranking «más vistos» (PRD-184)
 * consume únicamente vistas con sesión.
 */
export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const ip = getClientIp(request);

    // Rate limit global por IP: máx 60 eventos de vista por minuto.
    const globalLimited = await rateLimit(`events:view:global:${ip}`, { limit: 60, windowMs: 60_000 });
    if (globalLimited) {
      return NextResponse.json({ ok: false }, { status: 200 }); // silencioso para el cliente
    }

    const parsed = viewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
    }
    const { productId, sessionId } = parsed.data;

    // PRD-182: sin sessionId no se registra (los bots sin estado no inflan el
    // ranking). Respuesta silenciosa para no romper clientes sin storage.
    if (!sessionId) {
      return NextResponse.json({ ok: true });
    }

    // Rate limit por (IP, productId): máx 1 vista registrada cada 30 minutos por producto.
    const productLimited = await rateLimit(`events:view:${ip}:${productId}`, { limit: 1, windowMs: DEDUP_WINDOW_MS });
    if (productLimited) {
      return NextResponse.json({ ok: true }); // ya registrada recientemente, respuesta silenciosa
    }

    // Verificar que el producto existe antes de registrar
    const exists = await prisma.product.findUnique({
      where:  { id: productId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ ok: false }, { status: 200 }); // silencioso
    }

    // PRD-182: dedup en BD por (sessionId, productId) dentro de la ventana.
    const recent = await prisma.productView.findFirst({
      where: {
        productId,
        sessionId,
        createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      return NextResponse.json({ ok: true });
    }

    await prisma.productView.create({
      data: { productId, sessionId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/events/view]', err);
    return NextResponse.json({ ok: false }, { status: 200 }); // no romper al cliente
  }
}
