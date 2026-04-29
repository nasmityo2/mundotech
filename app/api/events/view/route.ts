import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/events/view
 * Body: { productId: string; sessionId?: string }
 * Registra una vista de producto en la tabla ProductView.
 * Fire-and-forget desde el cliente — no bloquea la navegación.
 */
export async function POST(request: Request) {
  try {
    const { productId, sessionId } = await request.json() as {
      productId: string;
      sessionId?: string;
    };

    if (!productId) {
      return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
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
