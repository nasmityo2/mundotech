'use client';

import { useEffect, useState, useMemo } from 'react';
import { Order } from '@/lib/definitions';
import {
  orderAnalyticsPeriodDate,
  orderCountsTowardValidatedRevenue,
  orderStoredRevenueTotal,
} from '@/lib/analytics-orders';
import Link from 'next/link';
import { getOrderDualMoney, hasFrozenBsPricing } from '@/lib/order-pricing';
import { BarChart2, TrendingUp, Package, ShoppingCart, Award, Eye, CreditCard, MapPin, Users, UserPlus, Wallet, BellRing, XCircle } from 'lucide-react';

interface TopViewedProduct {
  productId:   string;
  productName: string;
  viewCount:   number;
}

type Period = 'today' | 'week' | 'month' | 'all';

const formatBs = (n: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(n);

const formatUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function startOf(period: Period): Date | null {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay()); // domingo de esta semana
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

interface ProductStat {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta Semana',
  month: 'Este Mes',
  all: 'Todo el Tiempo',
};

function DeltaBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous == null) return null;
  if (previous === 0) {
    return current > 0
      ? <span className="text-[11px] font-semibold text-green-600">▲ nuevo vs. período anterior</span>
      : null;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% vs. período anterior
    </span>
  );
}

export default function AdminStatsPage() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [period, setPeriod]           = useState<Period>('month');
  const [sortBy, setSortBy]           = useState<'units' | 'revenue'>('units');
  const [topViewed, setTopViewed]     = useState<TopViewedProduct[]>([]);
  const [loadingViews, setLoadingViews] = useState(true);
  const [productCosts, setProductCosts] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // RUN-03/RUN-04 (AUDITORIA-2026-07): validar res.ok y la forma de la
    // respuesta — ante 401/500 la API devuelve { message } y `orders.filter`
    // reventaba el panel completo.
    fetch('/api/orders')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
        else setLoadError(true);
        setLoading(false);
      })
      .catch(err => {
        console.error('[admin-stats] error cargando pedidos:', err);
        setLoadError(true);
        setLoading(false);
      });

    fetch('/api/events/top-viewed')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(data => {
        if (Array.isArray(data)) setTopViewed(data);
        setLoadingViews(false);
      })
      .catch(err => {
        console.error('[admin-stats] error cargando más vistos:', err);
        setLoadingViews(false);
      });

    fetch('/api/admin/product-costs')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(data => {
        if (data && typeof data === 'object' && !Array.isArray(data)) setProductCosts(data);
      })
      .catch(err => console.error('[admin-stats] error cargando costos:', err));
  }, []);

  /** Solo pedidos con pago validado; el período usa paidAt si existe (día de cobro), si no createdAt (legado). */
  const filteredOrders = useMemo(() => {
    const from = startOf(period);
    const validated = orders.filter(o => orderCountsTowardValidatedRevenue(o.status));
    if (!from) return validated;
    return validated.filter(o => orderAnalyticsPeriodDate(o) >= from);
  }, [orders, period]);

  // Período anterior equivalente (misma duración justo antes), para comparativa.
  // 'Todo el tiempo' no tiene comparación → null.
  const prevPeriodOrders = useMemo(() => {
    const from = startOf(period);
    if (!from) return null;
    const spanMs = Date.now() - from.getTime();
    const prevFrom = new Date(from.getTime() - spanMs);
    return orders
      .filter(o => orderCountsTowardValidatedRevenue(o.status))
      .filter(o => {
        const d = orderAnalyticsPeriodDate(o);
        return d >= prevFrom && d < from;
      });
  }, [orders, period]);

  // Todos los pedidos del período sin filtrar por estado (para la tasa de cancelación).
  const periodOrdersAllStatuses = useMemo(() => {
    const from = startOf(period);
    if (!from) return orders;
    return orders.filter(o => orderAnalyticsPeriodDate(o) >= from);
  }, [orders, period]);

  const productStats = useMemo((): ProductStat[] => {
    const map = new Map<string, ProductStat>();
    for (const order of filteredOrders) {
      // PRD-205: prorratear el descuento del cupón entre los ítems del pedido.
      // Ratio = order.total / sum(item.price * qty) garantiza que la suma de
      // ingresos por producto cuadre con order.total (caja real).
      const orderItemsTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
      // Convertir el total del pedido a USD antes de prorratear: evita mezclar
      // pedidos modernos (Bs) con legado (USD) en el mismo acumulador.
      const orderRevenueUsd = getOrderDualMoney(orderStoredRevenueTotal(order), order).usdAmount ?? 0;
      const prorateRatio = orderItemsTotal > 0 ? orderRevenueUsd / orderItemsTotal : 1;

      for (const item of order.items) {
        const proratedRevenue = item.price * item.quantity * prorateRatio;
        const existing = map.get(item.productId);
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += proratedRevenue;
          existing.orderCount += 1;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            unitsSold: item.quantity,
            revenue: proratedRevenue,
            orderCount: 1,
          });
        }
      }
    }
    const arr = Array.from(map.values());
    return arr.sort((a, b) =>
      sortBy === 'units' ? b.unitsSold - a.unitsSold : b.revenue - a.revenue
    );
  }, [filteredOrders, sortBy]);

  const customerStats = useMemo(() => {
    const keyOf = (o: Order) => o.customerId || o.customerEmail || `anon-${o.id}`;
    // Conteo histórico de pedidos validados por cliente.
    const lifetimeCount = new Map<string, number>();
    for (const o of orders) {
      if (!orderCountsTowardValidatedRevenue(o.status)) continue;
      const k = keyOf(o);
      lifetimeCount.set(k, (lifetimeCount.get(k) ?? 0) + 1);
    }
    // Clientes activos en el período.
    const inPeriod = new Map<string, { name: string; count: number; usd: number }>();
    for (const o of filteredOrders) {
      const k = keyOf(o);
      const usd = getOrderDualMoney(orderStoredRevenueTotal(o), o).usdAmount ?? 0;
      const cur = inPeriod.get(k) ?? { name: o.customerName || 'Cliente', count: 0, usd: 0 };
      cur.count += 1; cur.usd += usd;
      inPeriod.set(k, cur);
    }
    let nuevos = 0, recurrentes = 0;
    for (const k of inPeriod.keys()) {
      if ((lifetimeCount.get(k) ?? 0) > 1) recurrentes += 1; else nuevos += 1;
    }
    const top = Array.from(inPeriod.values()).sort((a, b) => b.usd - a.usd).slice(0, 5);
    return { nuevos, recurrentes, top, totalCustomers: inPeriod.size };
  }, [orders, filteredOrders]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; usd: number }>();
    for (const o of filteredOrders) {
      const usd = getOrderDualMoney(orderStoredRevenueTotal(o), o).usdAmount ?? 0;
      const key = o.paymentMethod || 'Sin método';
      const cur = map.get(key) ?? { count: 0, usd: 0 };
      cur.count += 1; cur.usd += usd;
      map.set(key, cur);
    }
    return Array.from(map.entries()).map(([method, v]) => ({ method, ...v })).sort((a, b) => b.usd - a.usd);
  }, [filteredOrders]);
  const stateBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; usd: number }>();
    for (const o of filteredOrders) {
      const usd = getOrderDualMoney(orderStoredRevenueTotal(o), o).usdAmount ?? 0;
      const key = o.shippingDetails?.state?.trim() || 'Sin estado';
      const cur = map.get(key) ?? { count: 0, usd: 0 };
      cur.count += 1; cur.usd += usd;
      map.set(key, cur);
    }
    return Array.from(map.entries()).map(([state, v]) => ({ state, ...v })).sort((a, b) => b.usd - a.usd);
  }, [filteredOrders]);

  // Serie diaria de ingresos (USD) para el gráfico de tendencia.
  const dailyRevenueSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredOrders) {
      const dt = orderAnalyticsPeriodDate(o);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const usd = getOrderDualMoney(orderStoredRevenueTotal(o), o).usdAmount ?? 0;
      map.set(key, (map.get(key) ?? 0) + usd);
    }
    return Array.from(map.entries())
      .map(([date, usd]) => ({ date, usd }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders]);
  const maxDailyRevenue = Math.max(1, ...dailyRevenueSeries.map(d => d.usd));

  const totalUnits = productStats.reduce((s, p) => s + p.unitsSold, 0);
  // USD principal: cada pedido convertido a USD (modernos: total/tasa; legado: ya en USD).
  const totalRevenueUsd = filteredOrders.reduce(
    (s, o) => s + (getOrderDualMoney(orderStoredRevenueTotal(o), o).usdAmount ?? 0),
    0,
  );
  // Bs de referencia: solo pedidos modernos con tasa congelada (el legado no tiene Bs).
  const totalRevenueBs = filteredOrders
    .filter(o => hasFrozenBsPricing(o))
    .reduce((s, o) => s + orderStoredRevenueTotal(o), 0);
  const hasLegacyUsdOrders = filteredOrders.some(o => !hasFrozenBsPricing(o));
  // Denominador del % por producto: suma de ingresos ya prorateados.
  const itemRevenueTotal = productStats.reduce((s, p) => s + p.revenue, 0);
  const totalOrdersInPeriod = filteredOrders.length;
  // Ticket promedio (AOV) en USD.
  const avgTicketUsd = totalOrdersInPeriod > 0 ? totalRevenueUsd / totalOrdersInPeriod : 0;
  // Totales del período anterior para las comparativas (null si no aplica).
  const prevRevenueUsd = prevPeriodOrders
    ? prevPeriodOrders.reduce((s, o) => s + (getOrderDualMoney(orderStoredRevenueTotal(o), o).usdAmount ?? 0), 0)
    : null;
  const prevOrdersCount = prevPeriodOrders ? prevPeriodOrders.length : null;

  // productId → unidades vendidas (período actual), para la conversión.
  const unitsByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of productStats) m.set(p.productId, p.unitsSold);
    return m;
  }, [productStats]);

  // Ganancia estimada (aprox.): ingresos − costo (costo actual del producto × unidades vendidas).
  const profitStats = useMemo(() => {
    let revenue = 0, cost = 0, uncovered = 0;
    for (const p of productStats) {
      revenue += p.revenue;
      const unitCost = productCosts[p.productId];
      if (unitCost != null && unitCost > 0) cost += unitCost * p.unitsSold;
      else uncovered += p.unitsSold;
    }
    const profit = revenue - cost;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { profit, cost, marginPct, uncovered };
  }, [productStats, productCosts]);

  // Órdenes ya pagadas que esperan verificación del admin (alerta operativa, NO por período).
  const PENDING_STATUSES: string[] = ['Pendiente', 'Pendiente verificación Binance'];
  const pendingVerifyOrders = orders.filter(o => PENDING_STATUSES.includes(o.status));
  const pendingVerifyCount = pendingVerifyOrders.length;
  const pendingVerifyUsd = pendingVerifyOrders.reduce((s, o) => s + (getOrderDualMoney(orderStoredRevenueTotal(o), o).usdAmount ?? 0), 0);
  // Tasa de cancelación = cancelados / (validados + cancelados) del período.
  const cancelledCount = periodOrdersAllStatuses.filter(o => o.status === 'Cancelado').length;
  const cancelRateBase = totalOrdersInPeriod + cancelledCount;
  const cancelRate = cancelRateBase > 0 ? (cancelledCount / cancelRateBase) * 100 : 0;

  // PRD-EXTRA-ADM-1: los máximos deben calcularse sobre cada métrica, no sobre
  // la primera fila del orden activo (antes la barra podía superar el 100%).
  const maxUnits = Math.max(1, ...productStats.map(p => p.unitsSold));
  const maxRevenue = Math.max(1, ...productStats.map(p => p.revenue));

  const MEDAL_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={24} className="text-navy" /> Estadísticas de Ventas
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Productos más vendidos — {PERIOD_LABELS[period]}
          </p>
        </div>

        {/* Filtro de período */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-white text-navy border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-gray-100 border border-gray-200 flex items-center justify-center">
              <ShoppingCart size={18} className="text-navy" />
            </div>
            <p className="text-sm text-gray-500">Pedidos validados en el período</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? '—' : totalOrdersInPeriod}
          </p>
          {!loading && <div className="mt-1"><DeltaBadge current={totalOrdersInPeriod} previous={prevOrdersCount} /></div>}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <Package size={18} className="text-green-500" />
            </div>
            <p className="text-sm text-gray-500">Unidades vendidas</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? '—' : totalUnits}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-purple-500" />
            </div>
            <p className="text-sm text-gray-500">Ingresos validados del período</p>
          </div>
          {loading ? (
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          ) : (
            <div className="mt-2 space-y-0.5">
              <p className="text-2xl font-bold text-gray-900">{formatUsd(totalRevenueUsd)}</p>
              {totalRevenueBs > 0 && (
                <p className="text-sm text-gray-500">
                  ≈ {formatBs(totalRevenueBs)} en Bs.
                  {hasLegacyUsdOrders && (
                    <span className="text-xs text-gray-400"> · incl. pedidos legado USD</span>
                  )}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Ticket promedio: <span className="font-semibold text-gray-700">{formatUsd(avgTicketUsd)}</span>
              </p>
              <DeltaBadge current={totalRevenueUsd} previous={prevRevenueUsd} />
            </div>
          )}
        </div>
      </div>

      {/* RUN-03: aviso visible cuando la carga de pedidos falló */}
      {loadError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-bold">No se pudieron cargar los pedidos.</p>
            <p className="text-xs mt-0.5">Las cifras de abajo pueden estar vacías. Recarga la página; si persiste, vuelve a iniciar sesión.</p>
          </div>
        </div>
      )}

      {/* Pendientes de verificación y cancelaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* ADM-09: tarjeta enlazada a la cola de pedidos pendientes */}
        <Link
          href="/admin/orders?tab=pending"
          className={`block rounded-xl p-5 border transition-colors ${pendingVerifyCount > 0 ? 'bg-amber-50 border-amber-200 active:bg-amber-100' : 'bg-white border-gray-200 active:bg-gray-50'}`}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
              <BellRing size={18} className="text-amber-600" />
            </div>
            <p className="text-sm text-gray-500">Pendientes de verificación</p>
          </div>
          {loading ? (
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          ) : pendingVerifyCount === 0 ? (
            <div className="mt-2">
              <p className="text-2xl font-bold text-green-600">Todo al día ✓</p>
              <p className="text-xs text-gray-500 mt-0.5">No hay órdenes por revisar.</p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-3xl font-bold text-amber-700">{pendingVerifyCount}</p>
              <p className="text-xs text-gray-600 mt-0.5">orden{pendingVerifyCount !== 1 ? 'es' : ''} por revisar · {formatUsd(pendingVerifyUsd)} en juego · toca para ir a la cola</p>
            </div>
          )}
        </Link>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle size={18} className="text-red-500" />
            </div>
            <p className="text-sm text-gray-500">Tasa de cancelación</p>
          </div>
          {loading ? (
            <p className="text-2xl font-bold text-gray-900 mt-2">—</p>
          ) : (
            <div className="mt-2">
              <p className="text-2xl font-bold text-gray-900">{cancelRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-0.5">{cancelledCount} cancelado{cancelledCount !== 1 ? 's' : ''} de {cancelRateBase} (validados + cancelados)</p>
            </div>
          )}
        </div>
      </div>

      {/* Tendencia de ingresos (USD) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-purple-500" />
          <h2 className="font-semibold text-gray-800">Tendencia de ingresos (USD)</h2>
          <span className="ml-2 text-xs text-gray-400">{PERIOD_LABELS[period]}</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Cargando…</div>
        ) : dailyRevenueSeries.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Sin ingresos en el período.</div>
        ) : (
          <>
            <div className="flex items-end gap-1 h-40">
              {dailyRevenueSeries.map(d => (
                <div key={d.date} className="flex-1 flex flex-col justify-end min-w-0">
                  <div
                    className="w-full bg-brand-yellow rounded-t hover:bg-yellow-400 transition-colors"
                    style={{ height: `${Math.max(2, (d.usd / maxDailyRevenue) * 100)}%` }}
                    title={`${d.date}: ${formatUsd(d.usd)}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
              <span>{dailyRevenueSeries[0].date}</span>
              <span>{dailyRevenueSeries[dailyRevenueSeries.length - 1].date}</span>
            </div>
          </>
        )}
      </div>

      {/* Desgloses: método de pago y estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-navy" />
            <h2 className="font-semibold text-gray-800">Por método de pago</h2>
          </div>
          {paymentBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin datos en el período.</p>
          ) : (
            <ul className="space-y-3">
              {paymentBreakdown.map(p => {
                const share = totalRevenueUsd > 0 ? (p.usd / totalRevenueUsd) * 100 : 0;
                return (
                  <li key={p.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{p.method}</span>
                      <span className="text-gray-900 font-semibold">{formatUsd(p.usd)} <span className="text-xs text-gray-400">({p.count})</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-yellow rounded-full" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} className="text-navy" />
            <h2 className="font-semibold text-gray-800">Por estado (envío)</h2>
          </div>
          {stateBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin datos en el período.</p>
          ) : (
            <ul className="space-y-3">
              {stateBreakdown.slice(0, 8).map(s => {
                const share = totalRevenueUsd > 0 ? (s.usd / totalRevenueUsd) * 100 : 0;
                return (
                  <li key={s.state}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium truncate">{s.state}</span>
                      <span className="text-gray-900 font-semibold">{formatUsd(s.usd)} <span className="text-xs text-gray-400">({s.count})</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-yellow rounded-full" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-navy" />
            <h2 className="font-semibold text-gray-800">Clientes del período</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center bg-green-50 rounded-lg py-4">
              <p className="text-3xl font-bold text-green-600">{customerStats.nuevos}</p>
              <p className="text-xs text-gray-500 mt-1">Nuevos</p>
            </div>
            <div className="text-center bg-blue-50 rounded-lg py-4">
              <p className="text-3xl font-bold text-blue-600">{customerStats.recurrentes}</p>
              <p className="text-xs text-gray-500 mt-1">Recurrentes</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">{customerStats.totalCustomers} clientes activos · recurrente = más de 1 pedido validado histórico</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-navy" />
            <h2 className="font-semibold text-gray-800">Top clientes (por gasto)</h2>
          </div>
          {customerStats.top.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin datos en el período.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {customerStats.top.map((c, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                  <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.count} ped.</span>
                  <span className="text-sm font-semibold text-gray-900">{formatUsd(c.usd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ganancia estimada */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={18} className="text-green-600" />
          <h2 className="font-semibold text-gray-800">Ganancia estimada (USD)</h2>
          <span className="ml-2 text-xs text-gray-400">costo actual del producto · aproximado</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Ganancia bruta</p>
            <p className="text-2xl font-bold text-green-600">{formatUsd(profitStats.profit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Costo de lo vendido</p>
            <p className="text-2xl font-bold text-gray-900">{formatUsd(profitStats.cost)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Margen</p>
            <p className="text-2xl font-bold text-gray-900">{profitStats.marginPct.toFixed(1)}%</p>
          </div>
        </div>
        {profitStats.uncovered > 0 && (
          <p className="text-xs text-amber-600 mt-3">⚠️ {profitStats.uncovered} unidades sin costo registrado — el margen las ignora. Carga el costo en cada producto para mayor precisión.</p>
        )}
      </div>

      {/* Tabla de productos */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Ranking de Productos</h2>
          {/* Ordenar por */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setSortBy('units')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                sortBy === 'units' ? 'bg-white text-navy border border-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Por unidades
            </button>
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                sortBy === 'revenue' ? 'bg-white text-navy border border-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Por ingresos
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Cargando estadísticas...</div>
        ) : productStats.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            No hay ventas registradas para el período seleccionado.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {productStats.map((stat, index) => {
              const barWidth = sortBy === 'units'
                ? (stat.unitsSold / maxUnits) * 100
                : (stat.revenue / maxRevenue) * 100;
              const revenueShare = itemRevenueTotal > 0
                ? ((stat.revenue / itemRevenueTotal) * 100).toFixed(1)
                : '0';

              return (
                <div key={stat.productId} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Posición */}
                    <div className="w-8 flex-shrink-0 text-center">
                      {index < 3 ? (
                        <Award size={20} className={MEDAL_COLORS[index]} />
                      ) : (
                        <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                      )}
                    </div>

                    {/* Info del producto */}
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{stat.productName}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{stat.orderCount} pedido{stat.orderCount !== 1 ? 's' : ''}</span>
                        <span>{stat.unitsSold} unidade{stat.unitsSold !== 1 ? 's' : ''}</span>
                        <span className="text-purple-600 font-medium">{revenueShare}% del total</span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-yellow rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold text-gray-900">{formatUsd(stat.revenue)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{stat.unitsSold} uds.</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {productStats.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          {productStats.length} productos distintos vendidos en este período
        </p>
      )}

      {/* ── Top productos más vistos (server-side) ─────────────── */}
      <div className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Eye size={18} className="text-navy" />
          <h2 className="font-semibold text-gray-800">Productos Más Vistos</h2>
          {/* PRD-184: el endpoint solo cuenta vistas con sesión válida (filtro anti-bot) */}
          <span className="ml-2 text-xs text-gray-400">(vistas: últimos 90 días · conversión = unidades del período ÷ vistas, aprox.)</span>
        </div>
        {loadingViews ? (
          <div className="py-8 text-center text-gray-400 text-sm">Cargando vistas…</div>
        ) : topViewed.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">Sin datos todavía. Las vistas se acumulan conforme los clientes visiten productos.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {topViewed.map((item, i) => {
              const sold = unitsByProduct.get(item.productId) ?? 0;
              const conv = item.viewCount > 0 ? (sold / item.viewCount) * 100 : 0;
              return (
                <li key={item.productId} className="flex items-center gap-4 px-6 py-3">
                  <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.productId.slice(0, 10)}…</p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-sm font-semibold text-green-600">{conv.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400">{sold} vendidas</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-navy">
                    <Eye size={13} className="text-gray-400" />
                    {item.viewCount.toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
