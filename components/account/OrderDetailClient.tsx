'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck, MapPin, CreditCard, CheckCircle2, Package, Send, Home } from 'lucide-react';
import { EnrichedOrder } from '@/app/account/orders/[id]/page';
import { Badge } from '@/components/ui/Badge';

interface OrderDetailClientProps {
  order: EnrichedOrder;
}

const formatVES = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-VE', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const statusConfig: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }> = {
  Pendiente:    { label: 'Pendiente',  variant: 'warning' },
  'En Proceso': { label: 'En proceso', variant: 'info'    },
  Enviado:      { label: 'Enviado',    variant: 'info'    },
  Entregado:    { label: 'Entregado',  variant: 'success' },
  Cancelado:    { label: 'Cancelado',  variant: 'danger'  },
};

const timelineSteps = [
  { id: 'Pendiente',    label: 'Pedido recibido',  icon: CheckCircle2 },
  { id: 'En Proceso',   label: 'En preparación',   icon: Package      },
  { id: 'Enviado',      label: 'En camino',        icon: Send         },
  { id: 'Entregado',    label: 'Entregado',        icon: Home         },
];

const timelineIndex = (status: string) => {
  const idx = timelineSteps.findIndex((s) => s.id === status);
  return idx === -1 ? 0 : idx;
};

export default function OrderDetailClient({ order }: OrderDetailClientProps) {
  const router = useRouter();
  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const status = statusConfig[order.status] ?? { label: order.status, variant: 'neutral' as const };
  const currentStepIdx = timelineIndex(order.status);
  const isCancelled = order.status === 'Cancelado';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy transition-colors mb-3"
            >
              <ArrowLeft size={13} /> Volver
            </button>
            <h1 className="text-2xl md:text-[1.75rem] font-bold text-navy tracking-tight">
              Pedido #{String(order.orderNumber).padStart(4, '0')}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">Realizado el {formatDate(order.createdAt)}</p>
          </div>
          <Badge variant={status.variant} size="lg">{status.label}</Badge>
        </div>

        {/* Timeline visual */}
        {!isCancelled && (
          <div className="mt-7 pt-6 border-t border-slate-100">
            <div className="relative flex items-start justify-between">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-10" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-navy -z-10 transition-all duration-700"
                style={{
                  width: `calc(${(currentStepIdx / (timelineSteps.length - 1)) * 100}% - 32px * ${currentStepIdx / (timelineSteps.length - 1)})`,
                }}
              />
              {timelineSteps.map((step, idx) => {
                const isComplete = idx < currentStepIdx;
                const isActive   = idx === currentStepIdx;
                return (
                  <div key={step.id} className="flex flex-col items-center text-center w-1/4">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isComplete || isActive
                          ? 'bg-navy text-white shadow-soft'
                          : 'bg-white border-2 border-slate-200 text-slate-300'
                      } ${isActive ? 'ring-4 ring-navy/10' : ''}`}
                    >
                      <step.icon size={15} />
                    </div>
                    <p className={`mt-2 text-[12px] font-semibold leading-tight ${isComplete || isActive ? 'text-navy' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Productos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-navy">Artículos ({order.items.length})</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.productId} className="flex items-center gap-4 px-6 py-4">
                <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                  <Image
                    src={item.imageUrl || '/placeholder.png'}
                    alt={item.productName}
                    fill
                    sizes="64px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{item.productName}</p>
                  <p className="text-[12px] text-slate-500 nums">
                    {formatVES(item.price)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-navy nums whitespace-nowrap">
                  {formatVES(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="text-navy nums">{formatVES(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Envío</span>
              <span className="text-emerald-600 font-medium">Gratis</span>
            </div>
            <div className="border-t border-slate-200 pt-2.5 mt-1.5 flex items-end justify-between">
              <span className="text-base font-semibold text-navy">Total</span>
              <span className="text-2xl font-bold text-navy nums tracking-tight">
                {formatVES(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
            <div className="flex items-center gap-2 mb-3">
              <Truck size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-navy">Envío</h3>
            </div>
            <p className="text-sm font-semibold text-navy">{order.customerName}</p>
            <p className="text-sm text-slate-600 mt-1">{order.shippingDetails.address}</p>
            <p className="text-[13px] text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPin size={12} className="text-slate-400" />
              {order.shippingDetails.city}, {order.shippingDetails.state}
              {order.shippingDetails.zipCode !== 'N/A' && ` · ${order.shippingDetails.zipCode}`}
            </p>
            <p className="text-[13px] text-slate-500">{order.shippingDetails.country}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-navy">Pago</h3>
            </div>
            <p className="text-sm text-navy font-medium">{order.paymentMethod}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
