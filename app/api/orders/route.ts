import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { absoluteEmailUrl } from '@/emails/mundotech/site';
import type { OrderConfirmationPayload } from '@/emails/mundotech/types';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prismaOrderToOrder } from '@/lib/definitions';
import { checkoutSchema, executeCheckoutInTransaction } from '@/lib/checkout-order';
import { roundMoney2 } from '@/lib/exchange-rate';
import { sendOrderConfirmationEmail } from '@/lib/resend';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/** Solo admins pueden ver el listado global de pedidos. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders.map(prismaOrderToOrder));
}

/**
 * POST /api/orders — checkout atómico.
 *
 * El customerId del body es ignorado: siempre se usa session.user.id
 * del servidor para evitar que un cliente vincule un pedido al ID de
 * otra cuenta. Si no hay sesión, se trata como pedido de invitado.
 *
 * Binance Pay: el pedido inicia como "Pendiente verificación Binance".
 * El stock se descuenta atómicamente en esta misma transacción (`updateMany`
 * con `stock >= cantidad`). `approve-binance` solo avanza estado y `paidAt`;
 * al cancelar (PUT o cambio masivo) se debe restaurar inventario cuando el pedido siga en ese estado pendiente Binance.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (rateLimit(`orders:post:ip:${ip}`, { limit: 5, windowMs: 60_000 })) {
    return NextResponse.json(
      { message: 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.' },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (userId && userId !== 'guest') {
    if (rateLimit(`orders:post:user:${userId}`, { limit: 5, windowMs: 60_000 })) {
      return NextResponse.json(
        { message: 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.' },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      console.error('[POST /api/orders] Zod validation failed:', JSON.stringify(parsed.error.issues, null, 2));
      return NextResponse.json(
        { message: 'Datos de pedido inválidos.', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    // Ignorar el customerId enviado por el cliente; usar siempre la sesión del servidor
    const safeData = {
      ...parsed.data,
      customerId: session?.user?.id ?? 'guest',
    };

    const isBinanceManual = safeData.paymentMethod === 'Binance Pay';

    const order = await prisma.$transaction(async (tx) =>
      executeCheckoutInTransaction(tx, safeData, {
        deferStockDeduction: false,
        orderStatus: isBinanceManual ? 'Pendiente verificación Binance' : 'Pendiente',
      })
    );

    let recipientEmail = order.customerEmail?.trim() ?? '';
    if (!recipientEmail && order.customerId) {
      const u = await prisma.user.findUnique({
        where: { id: order.customerId },
        select: { email: true },
      });
      recipientEmail = u?.email?.trim() ?? '';
    }

    if (recipientEmail) {
      const productIds = [...new Set(order.items.map((i) => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, slug: true },
      });
      const slugById = new Map(
        products.map((p) => [p.id, (p.slug?.trim() || p.id) as string])
      );

      const rate = order.exchangeRateUsdBs;
      const priceUsdFromStored = (priceStored: number) =>
        rate != null && rate > 0 ? roundMoney2(priceStored / rate) : roundMoney2(priceStored);

      const itemsPayload = order.items.map((i) => ({
        name: i.productName,
        slug: slugById.get(i.productId) ?? i.productId,
        image: absoluteEmailUrl(i.imageUrl),
        priceUsd: priceUsdFromStored(i.price),
        quantity: i.quantity,
      }));

      const subtotalUsd = roundMoney2(
        itemsPayload.reduce((sum, line) => sum + line.priceUsd * line.quantity, 0)
      );
      const totalUsd =
        rate != null && rate > 0 ? roundMoney2(order.total / rate) : roundMoney2(order.total);
      const shippingUsd = roundMoney2(Math.max(0, totalUsd - subtotalUsd));

      const confirmationPayload: OrderConfirmationPayload = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName.trim() || 'Cliente',
        email: recipientEmail,
        createdAt: order.createdAt,
        status: order.status,
        items: itemsPayload,
        subtotalUsd,
        shippingUsd,
        totalUsd,
        exchangeRateUsdBs: rate ?? null,
        paymentMethod: order.paymentMethod,
        paymentBank: order.paymentBank,
        paymentReference: order.paymentReference,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingZipCode: order.shippingZipCode,
        shippingCountry: order.shippingCountry,
        customerPhone: order.customerPhone,
        shippingMethod: order.trackingCarrier ?? null,
      };

      await sendOrderConfirmationEmail(confirmationPayload);
    } else {
      console.warn(
        '[order-confirmation-email] Pedido',
        order.id,
        'creado sin email de contacto; no se envía confirmación.'
      );
    }

    return NextResponse.json(prismaOrderToOrder(order), { status: 201 });
  } catch (error) {
    console.error('[POST /api/orders]', error);
    const message = error instanceof Error ? error.message : 'Error al procesar la solicitud.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
