import { NextRequest, NextResponse } from 'next/server';
import { markCartOptedOut, findAbandonedCartByRecoveryToken } from '@/lib/abandoned-cart';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { emailSiteBaseUrl } from '@/emails/mundotech/site';

/**
 * GET /api/cart/unsubscribe?token=<recoveryToken>
 *
 * Enlace de baja incluido en el email de carrito abandonado.
 * Marca el carrito como OPTED_OUT y redirige a la página principal
 * con un mensaje de confirmación.
 *
 * PRD-179: con rate limit por IP — sin él, un tercero podía iterar tokens y
 * dar de baja remarketing ajeno en masa. Se mantiene GET porque es el enlace
 * directo del correo (un clic, sin fricción).
 * // DEPENDENCIA-06 (PRD-179): convertirlo a página de confirmación + POST
 * // requiere cambiar el CTA en emails/mundotech/AbandonedCartEmail.tsx.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const base = emailSiteBaseUrl().replace(/\/$/, '');

  const ip = getClientIp(req);
  if (await rateLimit(`cart:unsubscribe:ip:${ip}`, { limit: 10, windowMs: 10 * 60_000 })) {
    return NextResponse.redirect(`${base}/?unsubscribed=rate-limited`);
  }

  const token = req.nextUrl.searchParams.get('token')?.trim() ?? '';

  if (!token) {
    return NextResponse.redirect(`${base}/?unsubscribed=invalid`);
  }

  // PRD-219: token inexistente ya no redirige como éxito — antes
  // markCartOptedOut actualizaba 0 filas pero igual mostraba «?unsubscribed=cart».
  // La búsqueda usa el helper de lib/abandoned-cart, que hashea el token
  // (PRD-178: en BD solo vive recoveryTokenHash).
  const cart = await findAbandonedCartByRecoveryToken(token);
  if (!cart) {
    return NextResponse.redirect(`${base}/?unsubscribed=invalid`);
  }

  await markCartOptedOut(token);

  return NextResponse.redirect(`${base}/?unsubscribed=cart`);
}
