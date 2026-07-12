import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { rejectInvalidMutationOrigin } from '@/lib/security';
import { getUserCart, clearUserCart } from '@/lib/cart';

/** GET /api/cart — Devuelve los ítems del carrito del usuario autenticado. */
export async function GET() {
  const auth = await requireUser();
  if (!auth.authorized) return auth.response;

  try {
    const items = await getUserCart(auth.session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[GET /api/cart]', error);
    return NextResponse.json({ error: 'Error al obtener el carrito.' }, { status: 500 });
  }
}

/** DELETE /api/cart — Vacía el carrito del usuario autenticado. */
export async function DELETE(request: Request) {
  // PRD-011: mitigación CSRF — un sitio externo no puede vaciar el carrito.
  const originCheck = rejectInvalidMutationOrigin(request);
  if (originCheck) return originCheck;

  const auth = await requireUser();
  if (!auth.authorized) return auth.response;

  try {
    await clearUserCart(auth.session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/cart]', error);
    return NextResponse.json({ error: 'Error al vaciar el carrito.' }, { status: 500 });
  }
}
