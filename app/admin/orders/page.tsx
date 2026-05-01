'use client';

import { Suspense, useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Order, OrderStatus } from '@/lib/definitions';
import { DualOrderMoney } from '@/components/order/DualOrderMoney';
import { StatusUpdateMenu } from '@/app/components/admin/StatusUpdateMenu';
import ShipOrderDialog from '@/app/components/admin/ShipOrderDialog';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { Search, Truck } from 'lucide-react';

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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

type OrderTabKey = 'all' | 'pending' | 'paid' | 'processing' | 'shipped' | 'completed';

const TAB_ORDER: OrderTabKey[] = ['all', 'pending', 'paid', 'processing', 'shipped', 'completed'];

const TAB_LABELS: Record<OrderTabKey, string> = {
  all: 'Todos',
  pending: 'Pendientes',
  paid: 'Pagados',
  processing: 'En Proceso',
  shipped: 'Enviados',
  completed: 'Completados',
};

function parseTabFromSearchParams(params: URLSearchParams): OrderTabKey {
  const raw = params.get('tab');
  if (raw && TAB_ORDER.includes(raw as OrderTabKey)) return raw as OrderTabKey;
  const legacyStatus = params.get('status');
  if (
    legacyStatus === 'Pendiente' ||
    legacyStatus === 'Pendiente verificación Binance'
  ) {
    return 'pending';
  }
  return 'all';
}

function orderMatchesTab(order: Order, tab: OrderTabKey): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'pending':
      return (
        order.status === 'Pendiente' ||
        order.status === 'Pendiente verificación Binance'
      );
    case 'paid':
      return (
        order.status === 'En Proceso' ||
        order.status === 'Enviado' ||
        order.status === 'Entregado'
      );
    case 'processing':
      return order.status === 'En Proceso';
    case 'shipped':
      return order.status === 'Enviado';
    case 'completed':
      return order.status === 'Entregado';
    default:
      return true;
  }
}

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTabFromSearchParams(searchParams);

  const setTab = useCallback(
    (next: OrderTabKey) => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('status');
      if (next === 'all') p.delete('tab');
      else p.set('tab', next);
      const q = p.toString();
      router.replace(q ? `/admin/orders?${q}` : '/admin/orders', { scroll: false });
    },
    [router, searchParams]
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [shipDialogOrder, setShipDialogOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<OrderTabKey, number> = {
      all: orders.length,
      pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      completed: 0,
    };
    for (const o of orders) {
      if (orderMatchesTab(o, 'pending')) counts.pending += 1;
      if (orderMatchesTab(o, 'paid')) counts.paid += 1;
      if (orderMatchesTab(o, 'processing')) counts.processing += 1;
      if (orderMatchesTab(o, 'shipped')) counts.shipped += 1;
      if (orderMatchesTab(o, 'completed')) counts.completed += 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter(order => {
        const matchesSearch =
          !searchTerm ||
          String(order.orderNumber).includes(searchTerm) ||
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch && orderMatchesTab(order, tab);
      }),
    [orders, searchTerm, tab]
  );

  const updateOrderInList = (updated: Order) =>
    setOrders(curr => curr.map(o => (o.id === updated.id ? updated : o)));

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
        setOrders(curr => curr.map(o => (orderIds.includes(o.id) ? { ...o, status } : o)));
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
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig[o.status] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {o.status}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      mobileLabel: 'Total',
      align: 'right',
      cell: o => <DualOrderMoney amount={o.total} order={o} variant="admin" />,
    },
    {
      key: 'tracking',
      header: 'Tracking',
      mobileLabel: 'Tracking',
      cell: o =>
        o.trackingNumber ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-navy font-semibold">
            <Truck size={12} /> {o.trackingNumber}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
  ];

  const hasFilters = Boolean(searchTerm) || tab !== 'all';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Pedidos</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Gestiona y actualiza el estado de todos los pedidos.
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#020617] border border-slate-800/80 shadow-xl shadow-slate-900/20 overflow-hidden">
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Filtrar por estado</p>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin [scrollbar-color:rgba(100,116,139,0.35)_transparent]">
              {TAB_ORDER.map(key => {
                const selected = tab === key;
                const count = tabCounts[key];
                const showCount = key !== 'all';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={[
                      'shrink-0 whitespace-nowrap px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                      selected
                        ? 'bg-white text-[#0f172a] shadow-md shadow-black/20'
                        : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent',
                    ].join(' ')}
                  >
                    {TAB_LABELS[key]}
                    {showCount ? (
                      <span className={selected ? 'text-slate-600' : 'text-slate-500'}>
                        {' '}
                        ({count})
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative pt-1 border-t border-slate-700/60">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar por # o nombre…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 min-h-[48px] py-2.5 rounded-xl border border-slate-600/50 bg-slate-900/60 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/40 focus:border-brand-yellow/50"
            />
          </div>
        </div>
      </div>

      {selectedOrders.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-sm font-semibold text-navy">
            {selectedOrders.length} seleccionado{selectedOrders.length !== 1 ? 's' : ''}
          </span>
          <StatusUpdateMenu onUpdate={status => handleUpdateStatus(status, selectedOrders)} isBulk />
          <button
            type="button"
            onClick={() => setSelectedOrders([])}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 min-h-[36px] px-2"
          >
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
        emptyState={
          hasFilters
            ? 'No se encontraron pedidos con los filtros aplicados.'
            : 'No hay pedidos registrados todavía.'
        }
        onRowClick={o => router.push(`/admin/orders/${o.id}`)}
      />

      <p className="text-[11px] text-slate-400 mt-2 text-right">
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

function OrdersLoadingShell() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-14 bg-slate-200 rounded-xl" />
      <div className="h-36 bg-slate-800/40 rounded-2xl" />
      <div className="h-64 bg-white border border-slate-200 rounded-xl" />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<OrdersLoadingShell />}>
      <OrdersPageContent />
    </Suspense>
  );
}
