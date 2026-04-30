'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Order, OrderStatus } from '@/lib/definitions';
import { StatusUpdateMenu } from '@/app/components/admin/StatusUpdateMenu';
import ShipOrderDialog from '@/app/components/admin/ShipOrderDialog';
import {
  ArrowLeft, Package, MapPin, CreditCard, Clock, Copy, Check, Hash,
  Truck, ExternalLink, Edit3,
} from 'lucide-react';

const statusConfig: Record<string, string> = {
  'Pendiente verificación Binance': 'bg-amber-100 text-amber-900 border border-amber-200',
  Pendiente: 'bg-yellow-100 text-yellow-800',
  'En Proceso': 'bg-gray-100 text-navy border border-gray-200',
  Enviado: 'bg-slate-100 text-slate-800 border border-gray-200',
  Entregado: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString('es-VE', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') return 'N/A';
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);
};

function formatInternalId(id: string) {
  if (id.length <= 20) return id;
  return `${id.slice(0, 10)}…${id.slice(-8)}`;
}

export default function AdminOrderDetailPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [idCopied, setIdCopied] = useState(false);
  const [showShipDialog, setShowShipDialog] = useState(false);
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setOrder(data); setLoading(false); })
      .catch(() => { setOrder(null); setLoading(false); });
  }, [id]);

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">Cargando detalles del pedido...</div>;
  }

  if (!order) {
    return <div className="py-16 text-center text-red-500 text-sm">Pedido no encontrado.</div>;
  }

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order) return;
    if (status === 'Enviado') {
      setShowShipDialog(true);
      return;
    }
    try {
      const r = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      setOrder(await r.json());
    } catch {
      alert('No se pudo actualizar el estado del pedido.');
    }
  };

  const handleShipConfirm = async (tracking: {
    trackingNumber: string | null;
    trackingCarrier: string | null;
    trackingUrl: string | null;
    trackingPhotoUrl: string | null;
  }) => {
    const r = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Enviado', ...tracking }),
    });
    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      throw new Error(errorData.message ?? 'No se pudo guardar el tracking.');
    }
    setOrder(await r.json());
  };

  const handleEditTracking = async (tracking: {
    trackingNumber: string | null;
    trackingCarrier: string | null;
    trackingUrl: string | null;
    trackingPhotoUrl: string | null;
  }) => {
    const r = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tracking),
    });
    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      throw new Error(errorData.error ?? 'No se pudo actualizar el tracking.');
    }
    setOrder(await r.json());
  };

  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const isShipped = order.status === 'Enviado' || order.status === 'Entregado';
  const hasTracking = !!(order.trackingNumber || order.trackingCarrier || order.trackingUrl || order.trackingPhotoUrl);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 2000);
    } catch {
      alert('No se pudo copiar al portapapeles.');
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={14} /> Volver a pedidos
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pedido</p>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              #{String(order.orderNumber).padStart(4, '0')}
            </h1>
            <p className="text-xs text-gray-500 mt-1">{formatDateTime(order.createdAt)}</p>
          </div>
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusConfig[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {order.status}
          </span>
        </div>

        <div className="flex flex-wrap items-stretch gap-2">
          <button
            type="button"
            onClick={copyOrderId}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-2 text-[12px] active:bg-slate-100"
            title={order.id}
          >
            <Hash size={12} className="text-slate-400" />
            <span className="font-mono text-slate-700">{formatInternalId(order.id)}</span>
            {idCopied
              ? <span className="ml-1 inline-flex items-center gap-1 text-green-700"><Check size={12} /> Copiado</span>
              : <span className="ml-1 inline-flex items-center gap-1 text-slate-500"><Copy size={12} /></span>
            }
          </button>
          <StatusUpdateMenu onUpdate={handleStatusChange} currentStatus={order.status} />
        </div>
      </div>

      {/* Tracking destacado */}
      {(isShipped || hasTracking) && (
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Truck size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy">Información de envío</p>
                {order.shippedAt && (
                  <p className="text-[11px] text-gray-500">Enviado el {formatDateTime(order.shippedAt)}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowShipDialog(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-navy bg-white border border-gray-200 rounded-xl active:bg-gray-50"
            >
              <Edit3 size={13} /> Editar
            </button>
          </div>

          {hasTracking ? (
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {order.trackingCarrier && (
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Transportista</dt>
                  <dd className="text-sm font-semibold text-navy mt-0.5">{order.trackingCarrier}</dd>
                </div>
              )}
              {order.trackingNumber && (
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Número de seguimiento</dt>
                  <dd className="font-mono text-sm font-bold text-navy mt-0.5 break-all">{order.trackingNumber}</dd>
                </div>
              )}
              {order.trackingUrl && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Enlace de rastreo</dt>
                  <dd className="mt-0.5">
                    <a href={order.trackingUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline break-all">
                      Rastrear envío <ExternalLink size={12} />
                    </a>
                  </dd>
                </div>
              )}
              {order.trackingPhotoUrl && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Comprobante / guía</dt>
                  <a href={order.trackingPhotoUrl} target="_blank" rel="noreferrer" className="block max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.trackingPhotoUrl} alt="Tracking" className="w-full rounded-xl border border-gray-200" />
                  </a>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              Aún no se ha registrado tracking. Haz clic en <strong>Editar</strong> para agregar el número de guía y/o foto.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Package size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-800">Artículos</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {order.items.map(item => (
              <li key={item.productId} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(item.price)} × {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Envío</span><span className="text-green-600 font-medium">Gratis</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-200">
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <MapPin size={14} className="text-gray-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Envío a</h3>
            </div>
            <div className="text-sm text-gray-700 space-y-0.5">
              <p className="font-semibold text-gray-900">{order.customerName}</p>
              <p>{order.shippingDetails.address}</p>
              <p>{order.shippingDetails.city}, {order.shippingDetails.state}</p>
              {order.shippingDetails.zipCode !== 'N/A' && <p>CP: {order.shippingDetails.zipCode}</p>}
              <p>{order.shippingDetails.country}</p>
              {order.customerPhone && (
                <p className="pt-1.5 mt-1.5 border-t border-gray-100 text-xs">
                  <span className="text-gray-400">Teléfono:</span> <span className="font-medium">{order.customerPhone}</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <CreditCard size={14} className="text-gray-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Pago</h3>
            </div>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Método</dt>
                <dd className="font-medium text-gray-800 text-right">{order.paymentMethod}</dd>
              </div>
              {order.paymentReference && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Referencia</dt>
                  <dd className="font-mono font-semibold text-navy text-right break-all">{order.paymentReference}</dd>
                </div>
              )}
            </dl>
            {order.paymentProofUrl && (
              <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="block mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.paymentProofUrl} alt="Comprobante" className="w-full max-w-[180px] rounded-lg border border-gray-200" />
              </a>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Clock size={14} className="text-gray-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Cronología</h3>
            </div>
            <ul className="text-xs space-y-1.5 text-gray-600">
              <li><span className="text-gray-400">Creado:</span> {formatDateTime(order.createdAt)}</li>
              {order.shippedAt && <li><span className="text-gray-400">Enviado:</span> {formatDateTime(order.shippedAt)}</li>}
            </ul>
          </div>
        </div>
      </div>

      <ShipOrderDialog
        open={showShipDialog}
        orderNumber={order.orderNumber}
        initial={{
          trackingNumber:   order.trackingNumber,
          trackingCarrier:  order.trackingCarrier,
          trackingUrl:      order.trackingUrl,
          trackingPhotoUrl: order.trackingPhotoUrl,
        }}
        editMode={isShipped && hasTracking}
        onClose={() => setShowShipDialog(false)}
        onConfirm={isShipped ? handleEditTracking : handleShipConfirm}
      />
    </div>
  );
}
