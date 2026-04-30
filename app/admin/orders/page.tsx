'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Order, OrderStatus } from '@/lib/definitions';
import { StatusUpdateMenu } from '@/app/components/admin/StatusUpdateMenu';
import ShipOrderDialog from '@/app/components/admin/ShipOrderDialog';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { Search, Filter, Truck } from 'lucide-react';

const statusConfig: Record<string, string> = {
  'Pendiente verificación Binance': 'bg-amber-100 text-amber-900 border border-amber-200',
  Pendiente: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'En Proceso': 'bg-gray-100 text-navy border border-gray-200',
  Enviado: 'bg-slate-100 text-slate-800 border border-slate-200',
  Entregado: 'bg-green-100 text-green-800 border border-green-200',
  Cancelado: 'bg-red-100 text-red-800 border border-red-200',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-VE', {
    month: 'short', day: 'numeric',
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
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [shipDialogOrder, setShipDialogOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => orders.filter(order => {
    const matchesSearch =
      !searchTerm ||
      String(order.orderNumber).includes(searchTerm) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, searchTerm, statusFilter]);

  const updateOrderInList = (updated: Order) =>
    setOrders(curr => curr.map(o => o.id === updated.id ? updated : o));

  const handleUpdateStatus = async (status: OrderStatus, orderIds: string[]) => {
    if (status === 'Enviado' && orderIds.length === 1) {
      const target = orders.find(o => o.id === orderIds[0]);
      if (target) {
        setShipDialogOrder(target);
        return;
      }
    }

    const isBulk = orderIds.length > 1;
    const endpoint = isBulk ? '/api/orders/bulk-status-update' : `/api/orders/${orderIds[0]}/status`;
    const method = isBulk ? 'POST' : 'PUT';
    const body = isBulk ? JSON.stringify({ orderIds, status }) : JSON.stringify({ status });

    try {
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body });
      if (!response.ok) throw new Error('Error al actualizar el estado');
      if (!isBulk) {
        const updated = await response.json();
        updateOrderInList(updated);
      } else {
        setOrders(curr => curr.map(o => orderIds.includes(o.id) ? { ...o, status } : o));
        setSelectedOrders([]);
      }
    } catch {
      alert('No se pudo actualizar el estado de los pedidos.');
    }
  };

  const handleShipConfirm = async (tracking: {
    trackingNumber: string | null;
    trackingCarrier: string | null;
    trackingUrl: string | null;
    trackingPhotoUrl: string | null;
  }) => {
    if (!shipDialogOrder) return;
    const r = await fetch(`/api/orders/${shipDialogOrder.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Enviado', ...tracking }),
    });
    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      throw new Error(errorData.message ?? 'No se pudo guardar el tracking.');
    }
    updateOrderInList(await r.json());
  };

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'orderNumber',
      header: '#',
      primary: true,
      cell: o => <span className="font-mono font-bold text-navy">#{String(o.orderNumber).padStart(4, '0')}</span>,
    },
    {
      key: 'customer',
      header: 'Cliente',
      mobileLabel: 'Cliente',
      secondary: true,
      cell: o => <span className="truncate">{o.customerName}</span>,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      mobileLabel: 'Fecha',
      cell: o => <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(o.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      mobileLabel: 'Estado',
      align: 'center',
      cell: o => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {o.status}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      mobileLabel: 'Total',
      align: 'right',
      cell: o => <span className="font-bold text-gray-900 whitespace-nowrap">{formatCurrency(o.total)}</span>,
    },
    {
      key: 'tracking',
      header: 'Tracking',
      mobileLabel: 'Tracking',
      cell: o => o.trackingNumber
        ? <span className="inline-flex items-center gap-1 text-[11px] text-navy font-semibold"><Truck size={12} /> {o.trackingNumber}</span>
        : <span className="text-gray-300 text-xs">—</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-navy">Pedidos</h1>
        <p className="text-xs text-gray-500 mt-0.5">Gestiona y actualiza el estado de todos los pedidos.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-2.5 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar por # o nombre…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 min-h-[44px] py-2 border border-gray-200 bg-gray-50 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy"
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 min-h-[44px] py-2 border border-gray-200 bg-gray-50 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy w-full sm:w-auto"
          >
            <option value="">Todos los estados</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Acción masiva */}
      {selectedOrders.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-sm font-semibold text-navy">
            {selectedOrders.length} seleccionado{selectedOrders.length !== 1 ? 's' : ''}
          </span>
          <StatusUpdateMenu onUpdate={status => handleUpdateStatus(status, selectedOrders)} isBulk />
          <button onClick={() => setSelectedOrders([])} className="ml-auto text-xs text-gray-500 hover:text-gray-700 min-h-[36px] px-2">
            Cancelar
          </button>
        </div>
      )}

      <DataTable<Order>
        data={filteredOrders}
        columns={columns}
        rowKey={o => o.id}
        loading={loading}
        selectable
        selectedIds={selectedOrders}
        onSelectionChange={setSelectedOrders}
        emptyState={searchTerm || statusFilter
          ? 'No se encontraron pedidos con los filtros aplicados.'
          : 'No hay pedidos registrados todavía.'}
        onRowClick={o => router.push(`/admin/orders/${o.id}`)}
      />

      <p className="text-[11px] text-gray-400 mt-2 text-right">
        Mostrando {filteredOrders.length} de {orders.length} pedidos
      </p>

      <ShipOrderDialog
        open={!!shipDialogOrder}
        orderNumber={shipDialogOrder?.orderNumber ?? ''}
        initial={{
          trackingNumber: shipDialogOrder?.trackingNumber,
          trackingCarrier: shipDialogOrder?.trackingCarrier,
          trackingUrl: shipDialogOrder?.trackingUrl,
          trackingPhotoUrl: shipDialogOrder?.trackingPhotoUrl,
        }}
        onClose={() => setShipDialogOrder(null)}
        onConfirm={handleShipConfirm}
      />
    </div>
  );
}
