'use client';

import { useEffect, useState, useMemo } from 'react';
import { Order } from '@/lib/definitions';
import {
  orderAnalyticsPeriodDate,
  orderCountsTowardValidatedRevenue,
  orderStoredRevenueTotal,
} from '@/lib/analytics-orders';
import { BarChart2, TrendingUp, Package, ShoppingCart, Award, Eye } from 'lucide-react';

interface TopViewedProduct {
  productId:   string;
  productName: string;
  viewCount:   number;
}

type Period = 'today' | 'week' | 'month' | 'all';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(n);

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

export default function AdminStatsPage() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [period, setPeriod]           = useState<Period>('month');
  const [sortBy, setSortBy]           = useState<'units' | 'revenue'>('units');
  const [topViewed, setTopViewed]     = useState<TopViewedProduct[]>([]);
  const [loadingViews, setLoadingViews] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('/api/events/top-viewed')
      .then(r => r.json())
      .then(data => { setTopViewed(data); setLoadingViews(false); })
      .catch(() => setLoadingViews(false));
  }, []);

  /** Solo pedidos con pago validado; el período usa paidAt si existe (día de cobro), si no createdAt (legado). */
  const filteredOrders = useMemo(() => {
    const from = startOf(period);
    const validated = orders.filter(o => orderCountsTowardValidatedRevenue(o.status));
    if (!from) return validated;
    return validated.filter(o => orderAnalyticsPeriodDate(o) >= from);
  }, [orders, period]);

  const productStats = useMemo((): ProductStat[] => {
    const map = new Map<string, ProductStat>();
    for (const order of filteredOrders) {
      for (const item of order.items) {
        const existing = map.get(item.productId);
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += item.price * item.quantity;
          existing.orderCount += 1;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            unitsSold: item.quantity,
            revenue: item.price * item.quantity,
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

  const totalUnits = productStats.reduce((s, p) => s + p.unitsSold, 0);
  // PRD-220: misma lógica que el dashboard home — total almacenado del pedido
  // (incluye descuento de cupón), no la suma de líneas. Así ambas pantallas
  // muestran la misma cifra para el mismo período.
  const totalRevenue = filteredOrders.reduce((s, o) => s + orderStoredRevenueTotal(o), 0);
  // Denominador del % por producto: suma de líneas (sin cupón), para que los
  // porcentajes del ranking sigan sumando 100%.
  const itemRevenueTotal = productStats.reduce((s, p) => s + p.revenue, 0);
  const totalOrdersInPeriod = filteredOrders.length;

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
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loading ? '—' : formatCurrency(totalRevenue)}
          </p>
        </div>
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
                      <p className="font-bold text-gray-900">{formatCurrency(stat.revenue)}</p>
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
          <span className="ml-2 text-xs text-gray-400">(vistas con sesión · últimos 90 días)</span>
        </div>
        {loadingViews ? (
          <div className="py-8 text-center text-gray-400 text-sm">Cargando vistas…</div>
        ) : topViewed.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">Sin datos todavía. Las vistas se acumulan conforme los clientes visiten productos.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {topViewed.map((item, i) => (
              <li key={item.productId} className="flex items-center gap-4 px-6 py-3">
                <span className="text-sm font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400 font-mono">{item.productId.slice(0, 10)}…</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-navy">
                  <Eye size={13} className="text-gray-400" />
                  {item.viewCount.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
