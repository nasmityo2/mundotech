import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder, type Order, type OrderItem } from '@/lib/definitions';
import { parseOrderRef, type OrderRef } from '@/lib/order-ref';
import OrderDetailClient from '@/components/account/OrderDetailClient';

export interface EnrichedOrderItem extends OrderItem {
  imageUrl?: string;
}

export interface EnrichedOrder extends Omit<Order, 'items'> {
  items: EnrichedOrderItem[];
}

async function getEnrichedOrder(ref: OrderRef): Promise<EnrichedOrder | null> {
  const row = await prisma.order.findUnique({
    where:   'orderNumber' in ref ? { orderNumber: ref.orderNumber } : { id: ref.id },
    include: { items: true },
  });
  if (!row) return null;

  const order = prismaOrderToOrder(row);
  const enrichedItems: EnrichedOrderItem[] = order.items.map(item => ({
    ...item,
    imageUrl: item.imageUrl || '/placeholder.png',
  }));

  return { ...order, items: enrichedItems };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id: orderId }] = await Promise.all([
    getServerSession(authOptions),
    params,
  ]);

  if (!session || !session.user?.id) {
    return (
      <div className="p-6">
        <p className="text-red-500">Acceso denegado. Por favor inicia sesión.</p>
      </div>
    );
  }

  const ref = parseOrderRef(orderId);
  const order = ref ? await getEnrichedOrder(ref) : null;

  if (!order) {
    return <div className="p-6"><p className="text-red-500">Pedido no encontrado.</p></div>;
  }

  if (order.customerId !== session.user.id) {
    return (
      <div className="p-6">
        <p className="text-red-500">No tienes permiso para ver este pedido.</p>
      </div>
    );
  }

  return <OrderDetailClient order={order} />;
}
