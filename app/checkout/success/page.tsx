import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// H03: página de confirmación — noindex; contenido personal no indexable.
export const metadata: Metadata = {
  title: 'Pedido confirmado',
  robots: { index: false, follow: false },
};

import { isAdminRole } from '@/lib/is-admin-role';
import { Order, OrderItem, prismaOrderToOrder, toGuestOrderConfirmationDto } from '@/lib/definitions';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/security';
import SuccessClientPage from './SuccessClientPage';
import GuestSuccessClientPage from './GuestSuccessClientPage';

export interface EnrichedOrderItem extends OrderItem {
  imageUrl?: string;
}

export interface EnrichedOrder extends Omit<Order, 'items'> {
  items: EnrichedOrderItem[];
}

export const dynamic = 'force-dynamic';

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
  searchParams: Promise<{ orderId?: string; token?: string }>;
}) {
  const [session, params] = await Promise.all([
    getServerSession(authOptions),
    searchParams,
  ]);

  const { orderId, token } = params;

  // SESIÓN 06: ?token= reemplaza ?orderId= para guest.
  // Si hay token, se resuelve por hash; si hay orderId, se resuelve por ID directo.
  if (token) {
    return handleGuestToken(token, session);
  }

  if (!orderId) {
    return (
      <div className="text-center py-20 text-red-500">
        Error: No se proporcionó un enlace válido de pedido.
      </div>
    );
  }

  // ?orderId= legacy: usado por autenticados y admin (el email guest ya no envía ?orderId=).
  const order = await getEnrichedOrder(orderId);

  if (!order) {
    return (
      <div className="text-center py-20 text-red-500">
        No encontramos este pedido. Si crees que es un error, contáctanos
        con tu número de pedido.
      </div>
    );
  }

  if (!session?.user?.id) {
    // Guest con ?orderId= legacy (enlaces antiguos) — permitir con DTO seguro.
    // Buscar el pedido de nuevo para obtener el DTO mínimo.
    const guestRow = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!guestRow) {
      return (
        <div className="text-center py-20 text-red-500">
          No encontramos este pedido. Si crees que es un error, contáctanos
          con tu número de pedido.
        </div>
      );
    }
    const guestDto = toGuestOrderConfirmationDto(guestRow);
    return <GuestSuccessClientPage order={guestDto} />;
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

/**
 * SESIÓN 06: maneja acceso guest mediante token.
 * Hash → lookup por guestAccessTokenHash + expiresAt > now.
 * Anti-enumeración: mismo mensaje para ausente/inválido/expirado/ajeno.
 * Renderiza GuestSuccessClientPage con DTO mínimo.
 */
async function handleGuestToken(token: string, session: unknown) {
  // Si hay sesión, intentar acceso por token (compatibilidad para usuarios
  // que abren el enlace estando logueados).
  if (session && (session as { user?: { id?: string } }).user?.id) {
    // Usuario autenticado que usa token: buscar el pedido por hash, validar propiedad.
    const tokenHash = hashToken(token);
    const row = await prisma.order.findUnique({
      where: { guestAccessTokenHash: tokenHash },
      include: { items: true },
    });
    if (row && row.guestAccessTokenExpiresAt && row.guestAccessTokenExpiresAt > new Date()) {
      const order = prismaOrderToOrder(row);
      const enrichedItems: EnrichedOrderItem[] = order.items.map(item => ({
        ...item,
        imageUrl: item.imageUrl || '/placeholder.png',
      }));
      const enriched: EnrichedOrder = { ...order, items: enrichedItems };
      const sessionUser = (session as { user?: { id?: string; role?: string } }).user;
      const isOwner = enriched.customerId === sessionUser?.id;
      const isAdmin = isAdminRole(sessionUser?.role);
      if (isOwner || isAdmin) {
        return <SuccessClientPage order={enriched} />;
      }
    }
    // Si no es propietario/admin del pedido resuelto por token, intentar con session normal
  }

  // Guest (sin sesión o token ajeno): flujo estándar con DTO mínimo
  const tokenHash = hashToken(token);
  const row = await prisma.order.findUnique({
    where: { guestAccessTokenHash: tokenHash },
    include: { items: true },
  });

  // Anti-enumeración: mismo mensaje para ausente, expirado o inválido
  if (
    !row ||
    !row.guestAccessTokenExpiresAt ||
    row.guestAccessTokenExpiresAt <= new Date()
  ) {
    return (
      <div className="text-center py-20 text-red-500">
        No encontramos este pedido. Si crees que es un error, contáctanos
        con tu número de pedido.
      </div>
    );
  }

  const guestDto = toGuestOrderConfirmationDto(row);
  return <GuestSuccessClientPage order={guestDto} />;
}
