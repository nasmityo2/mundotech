import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { isAdminRole } from '@/lib/is-admin-role';
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
  const [session, { orderId }] = await Promise.all([
    getServerSession(authOptions),
    searchParams,
  ]);

  if (!orderId) {
    return (
      <div className="text-center py-20 text-red-500">
        Error: No se proporcionó un ID de pedido.
      </div>
    );
  }

  /*
   * PRD-001: el middleware ya exige sesión en /checkout/*, pero esta página
   * vuelve a comprobarla (defense-in-depth) y verifica la PROPIEDAD del
   * pedido. Sin esto, cualquier usuario autenticado podía leer el pedido de
   * otra persona (PII completa) con ?orderId={uuid}.
   */
  if (!session?.user?.id) {
    return (
      <div className="text-center py-20 text-red-500">
        Acceso denegado. Por favor inicia sesión para ver tu pedido.
      </div>
    );
  }

  const order = await getEnrichedOrder(orderId);

  /*
   * Anti-enumeración: mismo mensaje para "no existe" y "no es tuyo", así un
   * orderId ajeno no confirma la existencia del pedido. El admin sí puede
   * abrirlo (soporte post-venta).
   */
  const isOwner = order?.customerId === session.user.id;
  const isAdmin = isAdminRole((session.user as { role?: string }).role);

  if (!order || (!isOwner && !isAdmin)) {
    return (
      <div className="text-center py-20 text-red-500">
        No encontramos este pedido en tu cuenta. Si crees que es un error,
        contáctanos con tu número de pedido.
      </div>
    );
  }

  return <SuccessClientPage order={order} />;
}
