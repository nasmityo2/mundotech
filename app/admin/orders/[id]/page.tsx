'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Order, OrderStatus } from '@/lib/definitions';
import { StatusUpdateMenu } from '@/app/components/admin/StatusUpdateMenu';
import { ArrowLeft, Package, MapPin, CreditCard, Clock, Copy, Check, Hash } from 'lucide-react';

const BINANCE_VERIFY = 'Pendiente verificación Binance' as const;

const statusConfig: Record<string, string> = {
  'Pendiente verificación Binance': 'bg-amber-100 text-amber-900 border border-amber-200',
  Pendiente: 'bg-yellow-100 text-yellow-800',
  'En Proceso': 'bg-gray-100 text-navy border border-gray-200',
  Enviado: 'bg-slate-100 text-slate-800 border border-gray-200',
  Entregado: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
};

const formatDateTime = (iso: string) => {
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

/** ID de base de datos (CUID): muestra acortado; el completo va al portapapeles. */
function formatInternalId(id: string) {
  if (id.length <= 20) return id;
  return `${id.slice(0, 10)}…${id.slice(-8)}`;
}

export default function AdminOrderDetailPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [idCopied, setIdCopied] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setOrder(data); setLoading(false); })
      .catch(() => { setOrder(null); setLoading(false); });
  }, [id]);

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!order) return;
    try {
      const r = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      setOrder(updated);
    } catch {
      alert('No se pudo actualizar el estado del pedido.');
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-400">Cargando detalles del pedido...</div>;
  }

  if (!order) {
    return <div className="py-16 text-center text-red-500">Pedido no encontrado.</div>;
  }

  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

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
    <div>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Volver a pedidos
          </button>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Pedido #{String(order.orderNumber).padStart(4, '0')}
          </h1>
          <p className="mt-1.5 text-xs text-gray-500">
            Número visible para clientes y reportes. El código de abajo es solo para sistema y enlaces.
          </p>
          <div className="mt-3 flex flex-wrap items-stretch gap-2">
            <div
              className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-2 py-2"
              title={order.id}
            >
              <Hash size={14} className="flex-shrink-0 text-slate-400" aria-hidden />
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Referencia en base de datos
                </p>
                <p className="font-mono text-[13px] font-medium text-slate-800 truncate sm:max-w-md">
                  {formatInternalId(order.id)}
                </p>
              </div>
              <button
                type="button"
                onClick={copyOrderId}
                className="ml-1 flex flex-shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy shadow-sm transition hover:bg-slate-100 active:scale-[0.98]"
              >
                {idCopied ? (
                  <>
                    <Check size={14} className="text-green-600" aria-hidden />
                    <span className="text-green-700">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} aria-hidden />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusConfig[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {order.status}
          </span>
          <StatusUpdateMenu onUpdate={handleUpdateStatus} currentStatus={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: artículos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Artículos */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Package size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-800">Artículos del Pedido</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.items.map(item => (
                <li key={item.productId} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 flex-shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Envío</span><span className="text-green-600 font-medium">Gratis</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                <span>Total</span><span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: info del cliente */}
        <div className="space-y-4">
          {/* Fecha */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Fecha del Pedido</h3>
            </div>
            <p className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</p>
          </div>

          {/* Cliente */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={15} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Información de Envío</h3>
            </div>
            <div className="text-sm text-gray-700 space-y-0.5">
              <p className="font-semibold text-gray-900">{order.customerName}</p>
              <p>{order.shippingDetails.address}</p>
              <p>{order.shippingDetails.city}, {order.shippingDetails.state}</p>
              {order.shippingDetails.zipCode !== 'N/A' && (
                <p>CP: {order.shippingDetails.zipCode}</p>
              )}
              <p>{order.shippingDetails.country}</p>
            </div>
          </div>

          {/* Pago */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={15} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Pago</h3>
            </div>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Método</dt>
                <dd className="font-medium text-gray-800 text-right">{order.paymentMethod}</dd>
              </div>
              {order.paymentBank && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Banco</dt>
                  <dd className="text-gray-800 text-right">{order.paymentBank}</dd>
                </div>
              )}
              {order.paymentHolderIdNumber && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Cédula titular</dt>
                  <dd className="text-gray-800 text-right">{order.paymentHolderIdNumber}</dd>
                </div>
              )}
              {order.paymentHolderPhone && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Teléfono</dt>
                  <dd className="text-gray-800 text-right">{order.paymentHolderPhone}</dd>
                </div>
              )}
              {order.paymentReference && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Referencia</dt>
                  <dd className="font-mono font-semibold text-navy text-right">{order.paymentReference}</dd>
                </div>
              )}
              {order.customerIdNumber && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Cédula cliente</dt>
                  <dd className="text-gray-800 text-right">{order.customerIdNumber}</dd>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Celular cliente</dt>
                  <dd className="text-gray-800 text-right">{order.customerPhone}</dd>
                </div>
              )}
            </dl>
            {order.paymentProofUrl && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Comprobante de pago
                </p>
                <a
                  href={order.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block group"
                  title="Ver comprobante completo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.paymentProofUrl}
                    alt="Comprobante de pago"
                    className="w-full max-w-[180px] rounded-lg border border-gray-200 shadow-sm group-hover:opacity-80 transition-opacity"
                  />
                  <span className="text-xs text-navy underline mt-1 block">Ver imagen completa</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
