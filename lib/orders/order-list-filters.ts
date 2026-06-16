import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tabToStatusWhere, type OrderTabKey } from '@/lib/orders/order-tabs';

/** IDs cuyo orderNumber (cast a texto) coincide por prefijo o exacto. */
async function orderIdsMatchingNumberQuery(q: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Order"
    WHERE CAST("orderNumber" AS TEXT) LIKE ${q + '%'}
       OR CAST("orderNumber" AS TEXT) = ${q}
  `;
  return rows.map(r => r.id);
}

/** Combina filtro de pestaña + búsqueda q para listados paginados del admin. */
export async function buildOrderListWhere(
  tab: OrderTabKey,
  q: string,
): Promise<Prisma.OrderWhereInput> {
  const and: Prisma.OrderWhereInput[] = [];

  const tabWhere = tabToStatusWhere(tab);
  if (tabWhere) and.push(tabWhere);

  const clean = q.trim().replace(/^#/, '');
  if (clean) {
    const or: Prisma.OrderWhereInput[] = [
      { customerName: { contains: clean, mode: 'insensitive' } },
    ];
    const ids = await orderIdsMatchingNumberQuery(clean);
    if (ids.length > 0) {
      or.push({ id: { in: ids } });
    }
    and.push({ OR: or });
  }

  if (and.length === 0) return {};
  if (and.length === 1) return and[0]!;
  return { AND: and };
}
