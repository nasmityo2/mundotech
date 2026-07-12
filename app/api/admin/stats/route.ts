import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { logError } from '@/lib/safe-logger';
import { VALIDATED_REVENUE_STATUSES } from '@/lib/analytics-orders';
import { roundMoney2 } from '@/lib/exchange-rate';

// ── Zod validation ──────────────────────────────────────────────────────────

const RANGE_VALUES = ['7d', '30d', '90d', 'year', 'all'] as const;
const RangeSchema = z.enum(RANGE_VALUES);

const QuerySchema = z.object({
  range: RangeSchema.default('30d'),
  tz: z.string().default('America/Caracas'),
});

type Range = (typeof RANGE_VALUES)[number];

// ── DTO types ───────────────────────────────────────────────────────────────

export interface StatsSummary {
  revenue: number;
  orderCount: number;
  paidOrderCount: number;
  averageTicket: number;
  cancellationRate: number;
}

export interface DailyStats {
  date: string;
  revenue: number;
  orders: number;
}

export interface ByStatusStats {
  status: string;
  count: number;
}

export interface ByPaymentStats {
  method: string;
  count: number;
  revenue: number;
}

export interface TopProductStats {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface AdminStatsDTO {
  summary: StatsSummary;
  previousSummary: StatsSummary | null;
  daily: DailyStats[];
  byStatus: ByStatusStats[];
  byPayment: ByPaymentStats[];
  topProducts: TopProductStats[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Calcula cutoff ISO string para un rango dado en la timezone indicada. */
function computeCutoff(range: Range, tz: string): Date | null {
  if (range === 'all') return null;

  const now = new Date();
  // Construir un Intl.DateTimeFormat que nos dé el inicio del día en la tz deseada
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;

  // Inicio del día de hoy en la timezone indicada
  const todayStartStr = `${year}-${month}-${day}T00:00:00.000`;
  const todayStart = new Date(todayStartStr);

  const rangesMs: Record<Exclude<Range, 'all'>, number> = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    'year': 365 * 24 * 60 * 60 * 1000,
  };

  if (range in rangesMs) {
    return new Date(todayStart.getTime() - rangesMs[range as Exclude<Range, 'all'>]);
  }
  return null;
}

/** Diferencia en ms entre dos cutoffs (misma duración que el período actual). */
function spanMs(from: Date): number {
  return Date.now() - from.getTime();
}

/**
 * Convierte un valor Decimal de Prisma a number. Usado en agregaciones SQL
 * donde Prisma devuelve string para sumas de Decimal.
 */
function decimalToNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof val === 'object' && val !== null && typeof (val as { toNumber?: unknown }).toNumber === 'function') {
    const n = (val as { toNumber(): number }).toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Convierte el total almacenado en el pedido a su equivalente en USD.
 * Si el pedido tiene exchangeRateUsdBs (pedido moderno en Bs), divide por la tasa.
 * Si no (legado), el total ya está en USD.
 */
function storedTotalToUsd(totalStored: number, exchangeRate: number | null): number {
  if (exchangeRate != null && exchangeRate > 0) {
    return roundMoney2(totalStored / exchangeRate);
  }
  return roundMoney2(totalStored);
}

// ── Tipos raw de Prisma ─────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  total: unknown; // Prisma.Decimal
  exchangeRateUsdBs: unknown; // Prisma.Decimal | null
  status: string;
  paymentMethod: string;
  paidAt: Date | null;
  createdAt: Date;
}

interface OrderItemRow {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: unknown; // Prisma.Decimal
}

// ── Lógica de negocio ──────────────────────────────────────────────────────

const VALIDATED_STATUSES_SET = new Set<string>(VALIDATED_REVENUE_STATUSES as readonly string[]);

/**
 * Fecha usada para agrupar ventas validadas: paidAt si existe, createdAt si no (legacy).
 */
function periodDate(order: { paidAt: Date | null; createdAt: Date }): Date {
  return order.paidAt ?? order.createdAt;
}

function isValidRevenueStatus(status: string): boolean {
  return VALIDATED_STATUSES_SET.has(status);
}

// ── Route Handler ───────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawRange = searchParams.get('range') ?? '30d';
    const rawTz = searchParams.get('tz') ?? 'America/Caracas';

    const parsed = QuerySchema.safeParse({ range: rawRange, tz: rawTz });
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Rango inválido. Valores aceptados: ${RANGE_VALUES.join(', ')}` },
        { status: 400 },
      );
    }

    const { range, tz } = parsed.data;
    const cutoff = computeCutoff(range, tz);
    const isAllTime = cutoff === null;

    // ── Fetch orders ──────────────────────────────────────────────────────────
    const ordersWhere = isAllTime ? {} : { createdAt: { gte: cutoff } };

    const [orders, items] = await Promise.all([
      prisma.order.findMany({
        where: ordersWhere,
        select: {
          id: true,
          total: true,
          exchangeRateUsdBs: true,
          status: true,
          paymentMethod: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      prisma.orderItem.findMany({
        where: { order: ordersWhere },
        select: {
          orderId: true,
          productId: true,
          productName: true,
          quantity: true,
          price: true,
        },
      }),
    ]);

    // ── Build period DTO ──────────────────────────────────────────────────────
    const periodStats = buildPeriodStats(orders, items);
    const periodDto = toSummary(periodStats);

    // ── Previous period (same span before current cutoff) ─────────────────────
    let previousSummary: StatsSummary | null = null;
    if (!isAllTime) {
      const prevFrom = new Date(cutoff!.getTime() - spanMs(cutoff!));
      const prevWhere = {
        createdAt: { gte: prevFrom, lt: cutoff },
      };
      const [prevOrders, prevItems] = await Promise.all([
        prisma.order.findMany({
          where: prevWhere,
          select: {
            id: true,
            total: true,
            exchangeRateUsdBs: true,
            status: true,
            paymentMethod: true,
            paidAt: true,
            createdAt: true,
          },
        }),
        prisma.orderItem.findMany({
          where: { order: prevWhere },
          select: {
            orderId: true,
            productId: true,
            productName: true,
            quantity: true,
            price: true,
          },
        }),
      ]);
      const prevStats = buildPeriodStats(prevOrders, prevItems);
      previousSummary = toSummary(prevStats);
    }

    // ── Daily series ──────────────────────────────────────────────────────────
    const dailyAgg = aggregateDaily(orders, tz);

    // ── By status ─────────────────────────────────────────────────────────────
    const statusCounts = aggregateByStatus(orders);

    // ── By payment method ────────────────────────────────────────────────────
    const paymentAgg = aggregateByPayment(orders);

    // ── Top products ─────────────────────────────────────────────────────────
    const topProducts = aggregateTopProducts(items, orders, { take: 20 });

    const dto: AdminStatsDTO = {
      summary: periodDto,
      previousSummary,
      daily: dailyAgg,
      byStatus: statusCounts,
      byPayment: paymentAgg,
      topProducts,
    };

    return NextResponse.json(dto, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    logError('admin_stats_error', err, { route: '/api/admin/stats' });
    return NextResponse.json(
      { error: 'Error al obtener estadísticas.' },
      { status: 500 },
    );
  }
}

// ── Pure aggregation functions (testable) ────────────────────────────────────

interface PeriodStats {
  validatedOrders: OrderRow[];
  allPeriodOrders: OrderRow[];
  items: Map<string, OrderItemRow[]>;
}

function buildPeriodStats(orders: OrderRow[], items: OrderItemRow[]): PeriodStats {
  const validatedOrders = orders.filter((o) => isValidRevenueStatus(o.status));
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }
  return {
    validatedOrders,
    allPeriodOrders: orders,
    items: itemsByOrder,
  };
}

function toSummary(stats: PeriodStats): StatsSummary {
  const { validatedOrders, allPeriodOrders } = stats;

  const revenue = validatedOrders.reduce((sum, o) => {
    const totalNum = decimalToNumber(o.total);
    const rate = decimalToNumber(o.exchangeRateUsdBs) || 0;
    const rateNonNull = rate > 0 ? rate : null;
    return sum + storedTotalToUsd(totalNum, rateNonNull);
  }, 0);

  const orderCount = allPeriodOrders.length;
  const paidOrderCount = validatedOrders.length;
  const averageTicket = paidOrderCount > 0 ? roundMoney2(revenue / paidOrderCount) : 0;

  const cancelledCount = allPeriodOrders.filter((o) => o.status === 'Cancelado').length;
  const cancelBase = paidOrderCount + cancelledCount;
  const cancellationRate = cancelBase > 0 ? roundMoney2((cancelledCount / cancelBase) * 100) : 0;

  return {
    revenue: roundMoney2(revenue),
    orderCount,
    paidOrderCount,
    averageTicket,
    cancellationRate,
  };
}

/**
 * Agrupa órdenes validadas por día (en la timezone indicada).
 * La fecha de agrupación usa paidAt si existe, createdAt si no.
 */
function aggregateDaily(orders: OrderRow[], tz: string): DailyStats[] {
  const map = new Map<string, { revenue: number; orders: number }>();

  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  for (const o of orders) {
    if (!isValidRevenueStatus(o.status)) continue;

    const date = periodDate(o);
    const key = dateFormatter.format(date); // YYYY-MM-DD
    const totalNum = decimalToNumber(o.total);
    const rate = decimalToNumber(o.exchangeRateUsdBs) || 0;
    const rateNonNull = rate > 0 ? rate : null;
    const usd = storedTotalToUsd(totalNum, rateNonNull);

    const cur = map.get(key) ?? { revenue: 0, orders: 0 };
    cur.revenue += usd;
    cur.orders += 1;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([date, v]) => ({ date, revenue: roundMoney2(v.revenue), orders: v.orders }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateByStatus(orders: OrderRow[]): ByStatusStats[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    map.set(o.status, (map.get(o.status) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

function aggregateByPayment(orders: OrderRow[]): ByPaymentStats[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    if (!isValidRevenueStatus(o.status)) continue;
    const method = o.paymentMethod || 'Sin método';
    const totalNum = decimalToNumber(o.total);
    const rate = decimalToNumber(o.exchangeRateUsdBs) || 0;
    const rateNonNull = rate > 0 ? rate : null;
    const usd = storedTotalToUsd(totalNum, rateNonNull);
    const cur = map.get(method) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += usd;
    map.set(method, cur);
  }
  return Array.from(map.entries())
    .map(([method, v]) => ({ method, count: v.count, revenue: roundMoney2(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

function aggregateTopProducts(
  items: OrderItemRow[],
  orders: OrderRow[],
  options: { take: number },
): TopProductStats[] {
  // Build validated order IDs set
  const validatedOrderIds = new Set(
    orders.filter((o) => isValidRevenueStatus(o.status)).map((o) => o.id),
  );

  // Build exchange rate map
  const rateMap = new Map<string, number | null>();
  for (const o of orders) {
    const rate = decimalToNumber(o.exchangeRateUsdBs);
    rateMap.set(o.id, rate > 0 ? rate : null);
  }

  // Aggregate by product
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();

  for (const item of items) {
    if (!validatedOrderIds.has(item.orderId)) continue;
    const existing = productMap.get(item.productId) ?? {
      name: item.productName,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += item.quantity;
    const itemPrice = decimalToNumber(item.price);
    const rate = rateMap.get(item.orderId) ?? null;
    existing.revenue += storedTotalToUsd(itemPrice * item.quantity, rate);
    productMap.set(item.productId, existing);
  }

  return Array.from(productMap.entries())
    .map(([productId, v]) => ({
      productId,
      name: v.name,
      quantity: v.quantity,
      revenue: roundMoney2(v.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, options.take);
}

// ── Exports for testing ──────────────────────────────────────────────────────

export {
  computeCutoff,
  buildPeriodStats,
  toSummary,
  aggregateDaily,
  aggregateByStatus,
  aggregateByPayment,
  aggregateTopProducts,
  decimalToNumber,
  storedTotalToUsd,
  isValidRevenueStatus,
  periodDate,
};
