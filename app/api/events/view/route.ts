import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin } from '@/lib/security';
import { z } from 'zod';

const viewSchema = z.object({
  productId: z.string().min(1).max(64),
  sessionId: z.string().max(128).optional(),
});

/**
 * POST /api/events/view
 * Body: { productId: string; sessionId?: string }
 * Registra una vista de producto en la tabla ProductView.
 * Fire-and-forget desde el cliente — no bloquea la navegación.
 */
export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const ip = getClientIp(request);

    // Rate limit global por IP: máx 60 eventos de vista por minuto.
    const globalLimited = rateLimit(`events:view:global:${ip}`, { limit: 60, windowMs: 60_000 });
    if (globalLimited) {
      return NextResponse.json({ ok: false }, { status: 200 }); // silencioso para el cliente
    }

    const parsed = viewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
    }
    const { productId, sessionId } = parsed.data;

    // Rate limit por (IP, productId): máx 1 vista registrada cada 30 minutos por producto.
    const productLimited = rateLimit(`events:view:${ip}:${productId}`, { limit: 1, windowMs: 30 * 60_000 });
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

    await prisma.productView.create({
      data: {
        productId,
        sessionId: sessionId ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/events/view]', err);
    return NextResponse.json({ ok: false }, { status: 200 }); // no romper al cliente
  }
}
