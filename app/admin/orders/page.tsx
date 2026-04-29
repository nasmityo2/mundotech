'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Order, OrderStatus } from '@/lib/definitions';
import { StatusUpdateMenu } from '@/app/components/admin/StatusUpdateMenu';
import Link from 'next/link';
import { Search, Filter } from 'lucide-react';

const statusConfig: Record<string, string> = {
  'Pendiente verificación Binance': 'bg-amber-100 text-amber-900 border border-amber-200',
  Pendiente: 'bg-yellow-100 text-yellow-800',
  'En Proceso': 'bg-gray-100 text-navy border border-gray-200',
  Enviado: 'bg-slate-100 text-slate-800 border border-gray-200',
  Entregado: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-VE', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const ALL_STATUSES: OrderStatus[] = [
  'Pendiente verificación Binance',
  'Pendiente',
  'En Proceso',
  'Enviado',
  'Entregado',
  'Cancelado',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const checkbox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        !searchTerm ||
        String(order.orderNumber).includes(searchTerm) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleUpdateStatus = async (status: OrderStatus, orderIds: string[]) => {
    const isBulk = orderIds.length > 1;
    const endpoint = isBulk ? '/api/orders/bulk-status-update' : `/api/orders/${orderIds[0]}/status`;
    const method = isBulk ? 'POST' : 'PUT';
    const body = isBulk ? JSON.stringify({ orderIds, status }) : JSON.stringify({ status });

    try {
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body });
      if (!response.ok) throw new Error('Error al actualizar el estado');
      setOrders(curr => curr.map(o => orderIds.includes(o.id) ? { ...o, status } : o));
      if (isBulk) setSelectedOrders([]);
    } catch {
      alert('No se pudo actualizar el estado de los pedidos.');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOrders(e.target.checked ? filteredOrders.map(o => o.id) : []);
  };

  const handleRowCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    setSelectedOrders(prev => e.target.checked ? [...prev, orderId] : prev.filter(id => id !== orderId));
  };

  useEffect(() => {
    if (checkbox.current) {
      checkbox.current.indeterminate =
        selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length;
    }
  }, [selectedOrders, filteredOrders.length]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-gray-500 mt-1">Gestiona y actualiza el estado de todos los pedidos.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID o nombre de cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy"
          >
            <option value="">Todos los estados</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Acción masiva */}
      {selectedOrders.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-100 border border-gray-200 mb-4">
          <span className="text-sm font-semibold text-navy">{selectedOrders.length} pedido{selectedOrders.length !== 1 ? 's' : ''} seleccionado{selectedOrders.length !== 1 ? 's' : ''}</span>
          <StatusUpdateMenu onUpdate={status => handleUpdateStatus(status, selectedOrders)} isBulk />
          <button onClick={() => setSelectedOrders([])} className="ml-auto text-xs text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Cargando pedidos...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            No se encontraron pedidos {searchTerm || statusFilter ? 'con los filtros aplicados' : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="relative w-12 px-4 sm:px-6">
                    <input
                      type="checkbox"
                      ref={checkbox}
                      onChange={handleSelectAll}
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"># Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedOrders.includes(order.id) ? 'bg-gray-100' : ''}`}
                  >
                    <td className="relative w-12 px-4 sm:px-6">
                      {selectedOrders.includes(order.id) && (
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-brand-yellow" />
                      )}
                      <input
                        type="checkbox"
                        onChange={e => handleRowCheckboxChange(e, order.id)}
                        checked={selectedOrders.includes(order.id)}
                        className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-navy">
                      #{String(order.orderNumber).padStart(4, '0')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{order.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/orders/${order.id}`} className="text-xs text-navy font-semibold hover:underline whitespace-nowrap">
                          Ver detalles
                        </Link>
                        <StatusUpdateMenu
                          onUpdate={status => handleUpdateStatus(status, [order.id])}
                          currentStatus={order.status}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">
        Mostrando {filteredOrders.length} de {orders.length} pedidos
      </p>
    </div>
  );
}
