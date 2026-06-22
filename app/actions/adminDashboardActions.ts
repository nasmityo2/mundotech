'use server';

/**
 * adminDashboardActions.ts (PRD-083 / PRD-225)
 * KPIs agregados para el dashboard admin calculados en el servidor.
 *
 * Antes el dashboard cargaba el catálogo completo vía ProductContext (PRD-083)
 * y TODOS los pedidos con PII vía GET /api/orders (PRD-225 — mismo OOM que
 * PRD-195). Aquí solo viajan contadores, sumas y dos listas mínimas.
 */
import { prisma } from '@/lib/prisma';
import { requireAdminAction } from '@/lib/api-auth';
import { VALIDATED_REVENUE_STATUSES } from '@/lib/analytics-orders';
import type { OrderStatus } from '@/lib/definitions';
import { d, dn } from '@/lib/decimal';
import { roundMoney2 } from '@/lib/exchange-rate';

const LOW_STOCK_THRESHOLD = 3;

export interface DashboardRecentOrder {
  id:           string;
  orderNumber:  number;
  customerName: string;
  createdAt:    string;
  status:       string;
  total:        number;
  exchangeRateUsdBs: number | null;
}

export interface DashboardLowStockProduct {
  id:       string;
  name:     string;
  category: string;
  stock:    number;
}

export interface AdminDashboardData {
  totalProducts:   number;
  totalCategories: number;
  lowStock:        number;
  outOfStock:      number;
  lowStockProducts: DashboardLowStockProduct[];
  totalOrders:     number;
  pendingOrders:   number;
  inProcessOrders: number;
  shippedOrders:   number;
  /** Ingresos validados expresados en USD (moneda principal del panel). */
  revenueUsd: number;
  /** Suma en Bs de los pedidos validados con tasa congelada (excluye legado USD). */
  revenueBs: number;
  /** True si hay pedidos validados legado guardados en USD (sin equivalente Bs). */
  hasLegacyUsdRevenue: boolean;
  recentOrders:    DashboardRecentOrder[];
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireAdminAction();

  const [
    totalProducts,
    categoryRows,
    lowStock,
    outOfStock,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    inProcessOrders,
    shippedOrders,
    validatedRevenueRows,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({ distinct: ['category'], select: { category: true } }),
    prisma.product.count({ where: { stock: { gt: 0, lt: LOW_STOCK_THRESHOLD } } }),
    prisma.product.count({ where: { stock: 0 } }),
    prisma.product.findMany({
      where:   { stock: { lt: LOW_STOCK_THRESHOLD } },
      orderBy: [{ stock: 'asc' }, { createdAt: 'desc' }],
      take:    10,
      select:  { id: true, name: true, category: true, stock: true },
    }),
    prisma.order.count(),
    prisma.order.count({
      where: {
        status: {
          in: ['Pendiente', 'Pendiente verificación Binance'] satisfies OrderStatus[],
        },
      },
    }),
    prisma.order.count({ where: { status: 'En Proceso' satisfies OrderStatus } }),
    prisma.order.count({ where: { status: 'Enviado' satisfies OrderStatus } }),
    prisma.order.findMany({
      where:  { status: { in: [...VALIDATED_REVENUE_STATUSES] } },
      select: { total: true, exchangeRateUsdBs: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take:    8,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        createdAt: true,
        status: true,
        total: true,
        exchangeRateUsdBs: true,
      },
    }),
  ]);

  let revenueUsd = 0;
  let revenueBs = 0;
  let hasLegacyUsdRevenue = false;
  for (const row of validatedRevenueRows) {
    const total = d(row.total);
    const rate = dn(row.exchangeRateUsdBs);
    if (rate != null && rate > 0) {
      revenueUsd += roundMoney2(total / rate); // total en Bs → USD
      revenueBs += total;                       // Bs congelado
    } else {
      revenueUsd += total;                      // legado: total ya está en USD
      hasLegacyUsdRevenue = true;
    }
  }
  revenueUsd = roundMoney2(revenueUsd);
  revenueBs = roundMoney2(revenueBs);

  return {
    totalProducts,
    totalCategories: categoryRows.length,
    lowStock,
    outOfStock,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    inProcessOrders,
    shippedOrders,
    revenueUsd,
    revenueBs,
    hasLegacyUsdRevenue,
    recentOrders: recentOrders.map((o) => ({
      id:           o.id,
      orderNumber:  o.orderNumber,
      customerName: o.customerName,
      createdAt:    o.createdAt.toISOString(),
      status:       o.status,
      total:        d(o.total),
      exchangeRateUsdBs: dn(o.exchangeRateUsdBs),
    })),
  };
}
