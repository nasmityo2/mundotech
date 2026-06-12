import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// H03: página de confirmación — noindex; contenido personal no indexable.
export const metadata: Metadata = {
  title: 'Pedido confirmado',
  robots: { index: false, follow: false },
};
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

  const order = await getEnrichedOrder(orderId);

  if (!order) {
    return (
      <div className="text-center py-20 text-red-500">
        No encontramos este pedido. Si crees que es un error, contáctanos
        con tu número de pedido.
      </div>
    );
  }

  /*
   * PRD-207/249/250: acceso guest read-only cuando llega ?orderId={cuid}.
   * El cuid actúa como bearer token no adivinable; quien recibió el email
   * de confirmación (con ese link) es el único que puede acceder.
   * NO se acepta acceso por orderNumber secuencial.
   *
   * PRD-001 (defense-in-depth para usuarios autenticados): si hay sesión,
   * se valida propiedad del pedido. Anti-enumeración: mismo mensaje para
   * "no existe" y "no es tuyo" para usuarios autenticados con orderId ajeno.
   * El admin puede abrirlo para soporte post-venta.
   */
  if (!session?.user?.id) {
    // Guest: el cuid ya fue validado — renderizar vista de sólo lectura.
    return <SuccessClientPage order={order} />;
  }

  const isOwner = order.customerId === session.user.id;
  const isAdmin = isAdminRole((session.user as { role?: string }).role);

  if (!isOwner && !isAdmin) {
    return (
      <div className="text-center py-20 text-red-500">
        No encontramos este pedido en tu cuenta. Si crees que es un error,
        contáctanos con tu número de pedido.
      </div>
    );
  }

  return <SuccessClientPage order={order} />;
}
