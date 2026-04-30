import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder } from '@/lib/definitions';
import { checkoutSchema, executeCheckoutInTransaction } from '@/lib/checkout-order';
import { sendOrderConfirmationEmail } from '@/lib/resend';

function firstNameFromCustomerName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return 'Cliente';
  return t.split(/\s+/)[0] ?? t;
}

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
 * Binance manual: pedido en "Pendiente verificación Binance" sin descontar stock hasta aprobación admin.
 */
export async function POST(request: Request) {
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

    const isBinanceManual = parsed.data.paymentMethod === 'Binance Pay';

    const order = await prisma.$transaction(async (tx) =>
      executeCheckoutInTransaction(tx, parsed.data, {
        deferStockDeduction: isBinanceManual,
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
      await sendOrderConfirmationEmail(
        recipientEmail,
        firstNameFromCustomerName(order.customerName),
        {
          orderNumber: order.orderNumber,
          orderId: order.id,
          createdAt: order.createdAt,
          status: order.status,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentBank: order.paymentBank,
          paymentReference: order.paymentReference,
          shippingAddress: order.shippingAddress,
          shippingCity: order.shippingCity,
          shippingState: order.shippingState,
          shippingZipCode: order.shippingZipCode,
          shippingCountry: order.shippingCountry,
          customerPhone: order.customerPhone,
          items: order.items.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            price: i.price,
          })),
        }
      );
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
