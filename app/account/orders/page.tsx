import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { prismaOrderToOrder, type Order } from '@/lib/definitions';
import OrderHistoryClient from '@/components/account/OrderHistoryClient';

async function getUserOrders(userId: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where:   { customerId: userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(prismaOrderToOrder);
}

export default async function AccountOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Mis Pedidos</h1>
        <p className="text-red-500">Por favor, inicia sesión para ver tus pedidos.</p>
      </div>
    );
  }

  const orders = await getUserOrders(session.user.id);
  return <OrderHistoryClient orders={orders} />;
}
