import { NextRequest, NextResponse } from 'next/server';
import { markCartOptedOut } from '@/lib/abandoned-cart';
import { emailSiteBaseUrl } from '@/emails/mundotech/site';

/**
 * GET /api/cart/unsubscribe?token=<recoveryToken>
 *
 * Enlace de baja incluido en el email de carrito abandonado.
 * Marca el carrito como OPTED_OUT y redirige a la página principal
 * con un mensaje de confirmación.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token')?.trim() ?? '';

  if (!token) {
    return NextResponse.redirect(
      `${emailSiteBaseUrl().replace(/\/$/, '')}/?unsubscribed=invalid`,
    );
  }

  await markCartOptedOut(token);

  return NextResponse.redirect(
    `${emailSiteBaseUrl().replace(/\/$/, '')}/?unsubscribed=cart`,
  );
}
