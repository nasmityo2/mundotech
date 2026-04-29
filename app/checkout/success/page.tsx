import { Order, OrderItem, prismaOrderToOrder } from '@/lib/definitions';
import { prisma } from '@/lib/prisma';
import SuccessClientPage from './SuccessClientPage';

export interface EnrichedOrderItem extends OrderItem {
  imageUrl?: string;
}

export interface EnrichedOrder extends Omit<Order, 'items'> {
  items: EnrichedOrderItem[];
}

async function getEnrichedOrder(orderId: string): Promise<EnrichedOrder | null> {
  const row = await prisma.order.findUnique({
    where:   { id: orderId },
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

// En Next.js 15+, searchParams es una Promise y debe ser await-ada
export default async function SuccessPageWrapper({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  if (!orderId) {
    return (
      <div className="text-center py-20 text-red-500">
        Error: No se proporcionó un ID de pedido.
      </div>
    );
  }

  const order = await getEnrichedOrder(orderId);

  if (!order) {
    return (
      <div className="text-center py-20 text-red-500">
        Error: No se pudo encontrar el pedido con ID {orderId}.
      </div>
    );
  }

  return <SuccessClientPage order={order} />;
}
