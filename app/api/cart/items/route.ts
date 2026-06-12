import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/api-auth';
import { verifySameOrigin } from '@/lib/security';
import { upsertCartItem } from '@/lib/cart';

const bodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0),
});

/**
 * PATCH /api/cart/items — Inserta o actualiza un ítem en el carrito.
 * Si quantity === 0 el ítem se elimina.
 */
export async function PATCH(request: Request) {
  // PRD-011: mitigación CSRF en mutaciones del carrito.
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const auth = await requireUser();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { productId, quantity } = bodySchema.parse(body);
    await upsertCartItem(auth.session.user.id, productId, quantity);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos.', details: error.issues }, { status: 400 });
    }
    console.error('[PATCH /api/cart/items]', error);
    return NextResponse.json({ error: 'Error al actualizar el carrito.' }, { status: 500 });
  }
}
