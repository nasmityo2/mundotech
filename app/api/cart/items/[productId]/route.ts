import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { verifySameOrigin } from '@/lib/security';
import { removeCartItem } from '@/lib/cart';

/**
 * DELETE /api/cart/items/[productId] — Elimina un ítem del carrito por su productId.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  // PRD-011: mitigación CSRF en mutaciones del carrito.
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const auth = await requireUser();
  if (!auth.authorized) return auth.response;

  const { productId } = await params;
  if (!productId) {
    return NextResponse.json({ error: 'productId requerido.' }, { status: 400 });
  }

  try {
    await removeCartItem(auth.session.user.id, productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/cart/items/[productId]]', error);
    return NextResponse.json({ error: 'Error al eliminar el ítem.' }, { status: 500 });
  }
}
