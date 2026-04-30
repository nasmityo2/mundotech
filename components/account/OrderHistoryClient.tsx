'use client';

import { Order } from '@/lib/definitions';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ChevronRight, Package, ArrowRight, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface OrderHistoryClientProps {
  orders: Order[];
}

const formatVES = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

const statusConfig: Record<
  string,
  { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }
> = {
  Pendiente:    { label: 'Pendiente',  variant: 'warning' },
  'En Proceso': { label: 'En proceso', variant: 'info'    },
  Enviado:      { label: 'Enviado',    variant: 'info'    },
  Entregado:    { label: 'Entregado',  variant: 'success' },
  Cancelado:    { label: 'Cancelado',  variant: 'danger'  },
};

export default function OrderHistoryClient({ orders }: OrderHistoryClientProps) {
  const router = useRouter();

  if (orders.length === 0) {
    return (
      <div>
        <h1 className="text-2xl md:text-[1.75rem] font-bold text-navy tracking-tight mb-6">Mis pedidos</h1>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft px-6 py-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <ShoppingBag size={28} />
          </div>
          <h3 className="text-lg font-semibold text-navy">Aún no tienes pedidos</h3>
          <p className="text-slate-500 mt-1.5 text-sm max-w-sm mx-auto">
            Cuando hagas tu primera compra aparecerá aquí. Explora nuestro catálogo y encuentra tu próxima
            tecnología favorita.
          </p>
          <button
            onClick={() => router.push('/productos')}
            className="mt-6 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 h-11 rounded-xl hover:bg-navy-700 shadow-soft hover:shadow-card transition-all"
          >
            Explorar productos <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-[1.75rem] font-bold text-navy tracking-tight">Mis pedidos</h1>
        <span className="text-sm text-slate-500">
          {orders.length} pedido{orders.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const status = statusConfig[order.status] ?? { label: order.status, variant: 'neutral' as const };
          const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
          const previewNames = order.items.slice(0, 2).map((i) => i.productName).join(', ');
          const hasMore = order.items.length > 2;

          return (
            <button
              key={order.id}
              type="button"
              onClick={() => router.push(`/account/orders/${order.id}`)}
              className="group w-full text-left bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 hover:shadow-card hover:border-slate-300 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package size={18} className="text-navy" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-sm font-semibold text-navy">
                        #{String(order.orderNumber).padStart(4, '0')}
                      </p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1.5">{formatDate(order.createdAt)}</p>
                    <p className="text-sm text-navy mt-2.5 truncate">
                      {previewNames}
                      {hasMore ? ` · y ${order.items.length - 2} más` : ''}
                    </p>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {itemCount} artículo{itemCount !== 1 ? 's' : ''}
                    </p>
                    {order.trackingNumber && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Truck size={11} /> Tracking: {order.trackingNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-navy nums tracking-tight">
                      {formatVES(order.total)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-navy group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
