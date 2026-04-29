'use client';

import { useEffect, useState } from 'react';
import { useProducts } from '../../context/ProductContext';
import { Order } from '@/lib/definitions';
import {
  Package,
  Tag,
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' });

const statusConfig: Record<string, string> = {
  Pendiente:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'En Proceso': 'bg-gray-100 text-navy border border-gray-200',
  Enviado:      'bg-slate-100 text-slate-800 border border-gray-200',
  Entregado:    'bg-green-100 text-green-800',
  Cancelado:    'bg-red-100 text-red-800',
};

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
  const lowStock = products.filter(p => p.stock < 3).length;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pendiente').length;
  const inProcessOrders = orders.filter(o => o.status === 'En Proceso').length;
  const revenue = orders
    .filter(o => o.status !== 'Cancelado')
    .reduce((acc, o) => acc + o.total, 0);

  const recentOrders = orders.slice(0, 6);

  const statCards = [
    { label: 'Total Pedidos',    value: totalOrders,      icon: ShoppingCart, color: 'bg-navy',       bg: 'bg-gray-100' },
    { label: 'Pendientes',       value: pendingOrders,    icon: Clock,        color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { label: 'En Proceso',       value: inProcessOrders,  icon: TrendingUp,   color: 'bg-navy',       bg: 'bg-gray-100' },
    { label: 'Total Productos',  value: totalProducts,    icon: Package,      color: 'bg-green-500',  bg: 'bg-green-50' },
    { label: 'Categorías',       value: totalCategories,  icon: Tag,          color: 'bg-purple-500', bg: 'bg-purple-50' },
    { label: 'Stock Bajo',       value: lowStock,         icon: AlertCircle,  color: 'bg-red-500',    bg: 'bg-red-50' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resumen</h1>
        <p className="text-gray-500 mt-1">Bienvenido al panel de administración de MundoTech.</p>
      </div>

      {/* Ingresos totales */}
      <div className="bg-navy border border-gray-800 border-l-4 border-l-brand-yellow p-6 mb-8 text-white">
        <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Ingresos Totales</p>
        <p className="text-4xl font-bold mt-1">
          {loadingOrders ? '—' : formatCurrency(revenue)}
        </p>
        <p className="text-sm opacity-70 mt-1">Pedidos no cancelados</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white p-4 border border-gray-200">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color.replace('bg-', 'text-')} />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {label === 'Total Pedidos' || label.includes('dientes') || label === 'En Proceso'
                ? loadingOrders ? '—' : value
                : value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pedidos recientes */}
      <div className="bg-white border border-gray-200 overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Pedidos Recientes</h2>
          <Link href="/admin/orders" className="text-sm text-navy font-semibold hover:text-brand-yellow flex items-center gap-1">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        {loadingOrders ? (
          <div className="px-6 py-8 text-center text-gray-400">Cargando pedidos...</div>
        ) : recentOrders.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">No hay pedidos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-sm font-semibold text-navy">
                      #{String(order.orderNumber).padStart(4, '0')}
                    </td>
                    <td className="px-6 py-3 text-gray-700 font-medium">{order.customerName}</td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="text-navy hover:underline text-xs font-semibold">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Productos con stock bajo */}
      {lowStock > 0 && (
        <div className="bg-white border border-red-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-red-100">
            <h2 className="text-base font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle size={16} /> Productos con Stock Bajo
            </h2>
            <Link href="/admin/products" className="text-sm text-navy font-semibold hover:text-brand-yellow flex items-center gap-1">
              Gestionar <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {products.filter(p => p.stock < 3).map(p => (
                  <tr key={p.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-6 py-3 text-gray-500">{p.category}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {p.stock} unidades
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHomePage;
