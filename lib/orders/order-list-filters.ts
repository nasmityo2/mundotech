import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tabToStatusWhere, type OrderTabKey } from '@/lib/orders/order-tabs';

/** IDs cuyo orderNumber (cast a texto) coincide por prefijo o exacto (solo q numérico). */
async function orderIdsMatchingNumberQuery(q: string): Promise<string[]> {
  const clean = q.trim().replace(/^#/, '');
  if (!/^\d+$/.test(clean)) return [];

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Order"
    WHERE CAST("orderNumber" AS TEXT) LIKE ${clean + '%'}
       OR CAST("orderNumber" AS TEXT) = ${clean}
    LIMIT 500
  `;
  return rows.map(r => r.id);
}

/** Filtro Prisma solo por búsqueda q (sin pestaña). */
export async function buildOrderSearchWhere(q: string): Promise<Prisma.OrderWhereInput> {
  const clean = q.trim().replace(/^#/, '');
  if (!clean) return {};

  const or: Prisma.OrderWhereInput[] = [
    { customerName: { contains: clean, mode: 'insensitive' } },
  ];
  const ids = await orderIdsMatchingNumberQuery(clean);
  if (ids.length > 0) {
    or.push({ id: { in: ids } });
  }
  return { OR: or };
}

/** Combina filtro de pestaña + búsqueda q para listados paginados del admin. */
export async function buildOrderListWhere(
  tab: OrderTabKey,
  q: string,
): Promise<Prisma.OrderWhereInput> {
  const and: Prisma.OrderWhereInput[] = [];

  const tabWhere = tabToStatusWhere(tab);
  if (tabWhere) and.push(tabWhere);

  const searchWhere = await buildOrderSearchWhere(q);
  if (Object.keys(searchWhere).length > 0) and.push(searchWhere);

  if (and.length === 0) return {};
  if (and.length === 1) return and[0]!;
  return { AND: and };
}
