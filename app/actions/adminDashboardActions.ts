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
import { requirePermissionAction } from '@/lib/admin-access-server';
import { VALIDATED_REVENUE_STATUSES } from '@/lib/analytics-orders';
import type { OrderStatus } from '@/lib/definitions';
import { d, dn } from '@/lib/decimal';
import { roundMoney2 } from '@/lib/exchange-rate';
import { parseTimestamp, BACKUP_LAST_SUCCESS_KEY } from '@/lib/operations-health';

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
  /** ADM-05: desglose del KPI "por verificar" — pagos Binance pendientes. */
  binancePendingOrders: number;
  inProcessOrders: number;
  shippedOrders:   number;
  /** Ingresos validados expresados en USD (moneda principal del panel). */
  revenueUsd: number;
  /** Suma en Bs de los pedidos validados con tasa congelada (excluye legado USD). */
  revenueBs: number;
  /** True si hay pedidos validados legado guardados en USD (sin equivalente Bs). */
  hasLegacyUsdRevenue: boolean;
  recentOrders:    DashboardRecentOrder[];
  /** ADM-13 / PRD-039: false si AppConfig no tiene store_settings — el checkout
   *  estaría mostrando DEFAULT_SETTINGS sin datos bancarios reales. */
  bankingConfigured: boolean;
  /** INF-05 / ADM-12: fecha de la tasa BCV vigente (ISO) y si está desactualizada. */
  bcvRateDate: string | null;
  bcvStale: boolean;
  /** ADM-12: última corrida exitosa del backup (ISO), si el script la registró. */
  lastBackupAt: string | null;
}

/** La tasa BCV se considera vieja si su fecha tiene más de 2 días hábiles (~72 h). */
const BCV_STALE_MS = 72 * 60 * 60 * 1000;

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requirePermissionAction('DASHBOARD');

  const [
    totalProducts,
    categoryRows,
    lowStock,
    outOfStock,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    binancePendingOrders,
    inProcessOrders,
    shippedOrders,
    validatedRevenueRows,
    recentOrders,
    opsConfigRows,
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
    prisma.order.count({
      where: { status: 'Pendiente verificación Binance' satisfies OrderStatus },
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
    prisma.appConfig.findMany({
      where: {
        key: { in: ['store_settings', 'exchange_rate_bcv_date', 'backup_last_success_at'] },
      },
      select: { key: true, value: true },
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

  const opsMap = new Map(opsConfigRows.map((r) => [r.key, r.value]));
  const bankingConfigured = opsMap.has('store_settings');
  const bcvRateDateRaw = opsMap.get('exchange_rate_bcv_date') ?? null;
  const bcvRateDateMs = bcvRateDateRaw ? Date.parse(bcvRateDateRaw) : NaN;
  const bcvRateDate = Number.isFinite(bcvRateDateMs)
    ? new Date(bcvRateDateMs).toISOString()
    : null;
  const bcvStale = bcvRateDate == null || Date.now() - bcvRateDateMs > BCV_STALE_MS;
  const lastBackupRaw = opsMap.get(BACKUP_LAST_SUCCESS_KEY) ?? null;
  const lastBackupAt = parseTimestamp(lastBackupRaw);

  return {
    totalProducts,
    totalCategories: categoryRows.length,
    lowStock,
    outOfStock,
    lowStockProducts,
    totalOrders,
    pendingOrders,
    binancePendingOrders,
    inProcessOrders,
    shippedOrders,
    revenueUsd,
    revenueBs,
    hasLegacyUsdRevenue,
    bankingConfigured,
    bcvRateDate,
    bcvStale,
    lastBackupAt,
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
