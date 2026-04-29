import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { prismaOrderToOrder } from '@/lib/definitions';
import { checkoutSchema, executeCheckoutInTransaction } from '@/lib/checkout-order';

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

    return NextResponse.json(prismaOrderToOrder(order), { status: 201 });
  } catch (error) {
    console.error('[POST /api/orders]', error);
    const message = error instanceof Error ? error.message : 'Error al procesar la solicitud.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
