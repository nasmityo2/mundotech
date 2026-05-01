'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft, Truck, MapPin, CreditCard, CheckCircle2, Package, Send, Home,
  ExternalLink, Copy, Check, Camera,
} from 'lucide-react';
import { EnrichedOrder } from '@/app/account/orders/[id]/page';
import { Badge } from '@/components/ui/Badge';
import { getOrderDualMoney, hasFrozenBsPricing } from '@/lib/order-pricing';
import { DualOrderMoney, OrderFrozenRateBanner } from '@/components/order/DualOrderMoney';

interface OrderDetailClientProps {
  order: EnrichedOrder;
}

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
  const [trackingCopied, setTrackingCopied] = useState(false);
  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const status = statusConfig[order.status] ?? { label: order.status, variant: 'neutral' as const };
  const currentStepIdx = timelineIndex(order.status);
  const isCancelled = order.status === 'Cancelado';
  const hasTracking = !!(order.trackingNumber || order.trackingCarrier || order.trackingUrl || order.trackingPhotoUrl);

  const copyTrackingNumber = async () => {
    if (!order.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setTrackingCopied(true);
      window.setTimeout(() => setTrackingCopied(false), 2000);
    } catch {}
  };

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

      {/* ── Tracking visible al cliente cuando el admin lo registra ───────── */}
      {hasTracking && !isCancelled && (
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border-2 border-amber-200 shadow-soft p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-11 h-11 rounded-xl bg-brand-yellow text-navy flex items-center justify-center flex-shrink-0">
              <Truck size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-navy">Tu pedido está en camino</h2>
              {order.shippedAt && (
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Enviado el {formatDate(order.shippedAt)}
                </p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {order.trackingCarrier && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Empresa de envío</dt>
                <dd className="text-sm font-semibold text-navy mt-1">{order.trackingCarrier}</dd>
              </div>
            )}
            {order.trackingNumber && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Número de seguimiento</dt>
                <dd className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base font-bold text-navy break-all">{order.trackingNumber}</span>
                  <button
                    type="button"
                    onClick={copyTrackingNumber}
                    aria-label="Copiar número de seguimiento"
                    className="min-h-[36px] inline-flex items-center gap-1 px-2.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white active:bg-slate-100"
                  >
                    {trackingCopied
                      ? <><Check size={12} className="text-green-600" /> Copiado</>
                      : <><Copy size={12} /> Copiar</>}
                  </button>
                </dd>
              </div>
            )}
            {order.trackingUrl && (
              <div className="sm:col-span-2">
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 bg-navy text-white text-sm font-bold rounded-xl active:bg-navy/80 hover:bg-navy/90 transition-colors w-full sm:w-auto"
                >
                  Rastrear envío <ExternalLink size={14} />
                </a>
              </div>
            )}
            {order.trackingPhotoUrl && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                  <Camera size={11} /> Comprobante de envío
                </dt>
                <a href={order.trackingPhotoUrl} target="_blank" rel="noreferrer" className="block max-w-sm">
                  <Image
                    src={order.trackingPhotoUrl}
                    alt="Foto de la guía de envío"
                    width={400}
                    height={500}
                    className="w-full h-auto rounded-xl border border-slate-200 shadow-soft"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 text-center">Toca para ver completa</p>
                </a>
              </div>
            )}
          </dl>
        </div>
      )}

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
                  <p className="text-[11px] text-slate-500 nums mt-0.5 leading-snug">
                    {hasFrozenBsPricing(order) ? (
                      <>
                        {getOrderDualMoney(item.price, order).bs}
                        <span className="text-slate-400"> · </span>
                        {getOrderDualMoney(item.price, order).usd}
                        <span className="text-slate-400"> c/u</span>
                        <span> × {item.quantity}</span>
                      </>
                    ) : (
                      <>
                        {getOrderDualMoney(item.price, order).usd} c/u × {item.quantity}
                      </>
                    )}
                  </p>
                </div>
                <DualOrderMoney amount={item.price * item.quantity} order={order} />
              </li>
            ))}
          </ul>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500 items-start gap-3">
              <span>Subtotal</span>
              <DualOrderMoney amount={subtotal} order={order} />
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Envío</span>
              <span className="text-emerald-600 font-medium">Gratis</span>
            </div>
            <div className="border-t border-slate-200 pt-2.5 mt-1.5 flex items-end justify-between gap-3">
              <span className="text-base font-semibold text-navy">Total</span>
              <DualOrderMoney amount={order.total} order={order} emphasis="total" />
            </div>
          </div>
          <OrderFrozenRateBanner order={order} />
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
