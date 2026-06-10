'use client';

import { useEffect, useState } from 'react';
import { useProducts } from '@/context/ProductContext';
import { Order } from '@/lib/definitions';
import {
  orderCountsTowardValidatedRevenue,
  orderStoredRevenueTotal,
} from '@/lib/analytics-orders';
import {
  Package, Tag, ShoppingCart, Clock, TrendingUp, AlertCircle,
  ArrowRight, Truck, Users,
} from 'lucide-react';
import Link from 'next/link';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';

const formatBs = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });

const statusConfig: Record<string, string> = {
  Pendiente:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'En Proceso': 'bg-gray-100 text-navy border border-gray-200',
  Enviado:      'bg-slate-100 text-slate-800 border border-slate-200',
  Entregado:    'bg-green-100 text-green-800 border border-green-200',
  Cancelado:    'bg-red-100 text-red-800 border border-red-200',
};

/** Saludo según la hora de Venezuela (VET), como en el mostrador. */
function venezuelanGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return '¡Buenos días!';
  if (hour < 19) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

function venezuelanDate(): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

const AdminHomePage = () => {
  const { products } = useProducts();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoadingOrders(false); })
      .catch(() => setLoadingOrders(false));
  }, []);

  const totalProducts = products.length;
  const totalCategories = new Set(products.map(p => p.category)).size;
  const lowStock = products.filter(p => p.stock < 3 && p.stock > 0).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pendiente' || o.status === 'Pendiente verificación Binance').length;
  const inProcessOrders = orders.filter(o => o.status === 'En Proceso').length;
  const shippedOrders = orders.filter(o => o.status === 'Enviado').length;
  const revenue = orders
    .filter(o => orderCountsTowardValidatedRevenue(o.status))
    .reduce((acc, o) => acc + orderStoredRevenueTotal(o), 0);

  const recentOrders = orders.slice(0, 8);
  const lowStockProducts = products.filter(p => p.stock < 3).slice(0, 10);

  const orderColumns: DataTableColumn<Order>[] = [
    {
      key: 'orderNumber', header: '#', primary: true,
      cell: o => <span className="font-mono font-bold text-navy">#{String(o.orderNumber).padStart(4, '0')}</span>,
    },
    {
      key: 'customer', header: 'Cliente', secondary: true, mobileLabel: 'Cliente',
      cell: o => <span className="truncate">{o.customerName}</span>,
    },
    {
      key: 'date', header: 'Fecha', mobileLabel: 'Fecha',
      cell: o => <span className="text-xs text-gray-500">{formatShortDate(o.createdAt)}</span>,
    },
    {
      key: 'status', header: 'Estado', mobileLabel: 'Estado', align: 'center',
      cell: o => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {o.status}
        </span>
      ),
    },
    {
      key: 'total', header: 'Total', mobileLabel: 'Total', align: 'right',
      cell: o => <span className="font-bold text-gray-900 whitespace-nowrap">{formatBs(o.total)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-navy">{venezuelanGreeting()} Así va la tienda</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 capitalize">{venezuelanDate()} · Barquisimeto</p>
      </div>

      {/* Hero ingresos */}
      <div className="bg-gradient-to-br from-navy to-[#0f172a] rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Ingresos totales (VES)</p>
          <p className="text-3xl sm:text-4xl font-black mt-1.5 tabular-nums">
            {loadingOrders ? '—' : formatBs(revenue)}
          </p>
          <p className="text-[11px] opacity-60 mt-1">Solo pagos validados · montos según el pedido (Bs o USD según corresponda)</p>
        </div>
      </div>

      {/* KPIs grid 2 cols mobile / 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <KpiCard label="Pedidos totales" value={loadingOrders ? '—' : totalOrders} icon={ShoppingCart} accent="navy" href="/admin/orders" />
        <KpiCard label="Por verificar pago" value={loadingOrders ? '—' : pendingOrders} icon={Clock} accent="yellow" href="/admin/orders?tab=pending" />
        <KpiCard label="Para despachar" value={loadingOrders ? '—' : inProcessOrders} icon={TrendingUp} accent="navy" href="/admin/orders?tab=processing" />
        <KpiCard label="En camino" value={loadingOrders ? '—' : shippedOrders} icon={Truck} accent="success" href="/admin/orders?tab=shipped" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <KpiCard label="Productos" value={totalProducts} icon={Package} accent="navy" href="/admin/products" />
        <KpiCard label="Categorías" value={totalCategories} icon={Tag} accent="navy" href="/admin/categories" />
        <KpiCard label="Stock bajo" value={lowStock} icon={AlertCircle} accent={lowStock > 0 ? 'warning' : 'navy'} href="/admin/products" />
        <KpiCard label="Agotados" value={outOfStock} icon={AlertCircle} accent={outOfStock > 0 ? 'danger' : 'navy'} href="/admin/products" />
      </div>

      {/* Pedidos recientes */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-black text-navy uppercase tracking-wide">Pedidos recientes</h2>
          <Link href="/admin/orders" className="min-h-[36px] inline-flex items-center gap-1 text-xs text-navy font-semibold active:bg-gray-100 px-2 rounded">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>
        <DataTable<Order>
          data={recentOrders}
          columns={orderColumns}
          rowKey={o => o.id}
          loading={loadingOrders}
          emptyState="Aún no hay pedidos."
          onRowClick={o => { window.location.href = `/admin/orders/${o.id}`; }}
        />
      </section>

      {/* Stock bajo */}
      {lowStockProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black text-red-700 uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle size={14} /> Stock crítico
            </h2>
            <Link href="/admin/products?stock=low" className="min-h-[36px] inline-flex items-center gap-1 text-xs text-navy font-semibold active:bg-gray-100 px-2 rounded">
              Reabastecer <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="bg-white border border-red-200 rounded-2xl divide-y divide-red-100 overflow-hidden">
            {lowStockProducts.map(p => (
              <li key={p.id}>
                <Link href={`/admin/products`} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-red-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{p.category}</p>
                  </div>
                  <span className={`flex-shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {p.stock === 0 ? 'Agotado' : `${p.stock} uds`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

function KpiCard({
  label, value, icon: Icon, accent, href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: 'navy' | 'yellow' | 'warning' | 'danger' | 'success';
  href?: string;
}) {
  const styles = {
    navy:    { bg: 'bg-gray-100',    iconColor: 'text-navy' },
    yellow:  { bg: 'bg-yellow-50',   iconColor: 'text-yellow-600' },
    warning: { bg: 'bg-orange-50',   iconColor: 'text-orange-600' },
    danger:  { bg: 'bg-red-50',      iconColor: 'text-red-600' },
    success: { bg: 'bg-green-50',    iconColor: 'text-green-600' },
  }[accent];

  const cardClass = 'bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 active:bg-gray-50 transition flex flex-col';
  const inner = (
    <>
      <div className={`w-9 h-9 rounded-xl ${styles.bg} flex items-center justify-center mb-2`}>
        <Icon size={17} className={styles.iconColor} />
      </div>
      <p className="text-2xl sm:text-3xl font-black text-navy tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">{label}</p>
    </>
  );

  return href
    ? <Link href={href} className={cardClass}>{inner}</Link>
    : <div className={cardClass}>{inner}</div>;
}

export default AdminHomePage;
