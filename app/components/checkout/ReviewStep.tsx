'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Loader2, CheckCircle2, Store, Building2, CreditCard } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ShippingFormData } from './ShippingForm';
import { PaymentFormData } from './PaymentForm';
import { formatCurrency } from '@/lib/utils';

interface ReviewStepProps {
  shippingData: ShippingFormData | null;
  paymentData: PaymentFormData | null;
}

const ReviewStep = ({ shippingData, paymentData }: ReviewStepProps) => {
  const { data: session } = useSession();
  const { cart, clearCart, getCartTotal, isCartLoading } = useCart();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = getCartTotal();
  const total = subtotal;

  const handleConfirmOrder = async () => {
    if (!shippingData || !paymentData) {
      setError('Faltan datos de envío o pago.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const orderPayload = {
      customerId: session?.user?.id || 'guest',
      customerName: `${shippingData.firstName} ${shippingData.lastName}`,
      customerEmail: shippingData.email?.trim() || session?.user?.email?.trim() || null,
      customerPhone: shippingData.phoneNumber,
      customerIdNumber: shippingData.idNumber,
      shippingDetails: {
        address:
          shippingData.shippingMethod === 'tienda'
            ? 'Retiro en tienda MundoTech'
            : 'Retiro en Oficina MRW',
        city: shippingData.shippingMethod === 'mrw' ? (shippingData.mrwOffice ?? '') : 'Barquisimeto',
        state: shippingData.shippingMethod === 'mrw' ? (shippingData.mrwState ?? '') : 'Lara',
        zipCode: 'N/A',
        country: 'Venezuela',
      },
      paymentMethod:
        paymentData.paymentMethod === 'pagomovil'
          ? 'Pago Móvil'
          : paymentData.paymentMethod === 'binancepay'
            ? 'Binance Pay'
            : 'Transferencia Bancaria',
      paymentBank: paymentData.bank || null,
      paymentHolderIdNumber: paymentData.holderIdNumber || null,
      paymentHolderPhone: paymentData.holderPhone || null,
      paymentReference: paymentData.referenceNumber || null,
      paymentProofUrl: paymentData.proofImageUrl || null,
      items: cart.map((item) => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.image || item.images?.[0] || '',
      })),
      total,
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        errors?: unknown;
      };

      if (!response.ok) {
        const apiMsg = body.message ?? 'Error al crear el pedido.';
        console.error('[checkout] API error:', response.status, body);
        throw new Error(apiMsg);
      }

      clearCart();
      router.push(`/checkout/success?orderId=${body.id}`);
    } catch (err) {
      console.error('[checkout] handleConfirmOrder:', err);
      setError(err instanceof Error ? err.message : 'Hubo un problema. Por favor, inténtalo de nuevo.');
      setIsProcessing(false);
    }
  };

  if (isCartLoading) {
    return <div className="py-8 text-center text-slate-500">Cargando información del carrito…</div>;
  }

  const ShippingIcon = shippingData?.shippingMethod === 'tienda' ? Store : Building2;

  const paymentLabel =
    paymentData?.paymentMethod === 'pagomovil'
      ? 'Pago Móvil'
      : paymentData?.paymentMethod === 'binancepay'
        ? 'Binance (verificación manual)'
        : 'Transferencia';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-navy tracking-tight">Revisión final</h2>
        <p className="text-sm text-slate-500 mt-1">Verifica tus datos antes de confirmar el pedido.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">Productos ({cart.length})</h3>
          <span className="text-xs text-slate-500 nums">{formatCurrency(subtotal)}</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {cart.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              <div className="relative w-12 h-12 flex-shrink-0 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                <Image
                  src={item.image || item.images?.[0] || '/placeholder.png'}
                  alt={item.name}
                  fill
                  sizes="48px"
                  className="object-contain p-1.5"
                />
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-sm text-navy truncate">{item.name}</p>
                <p className="text-[12px] text-slate-500 nums">
                  {formatCurrency(item.price)} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-navy nums whitespace-nowrap">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShippingIcon size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-navy">
              {shippingData?.shippingMethod === 'tienda' ? 'Retiro en tienda' : 'Retiro MRW'}
            </h3>
          </div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Nombre</dt>
              <dd className="text-navy text-right">
                {shippingData?.firstName} {shippingData?.lastName}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Cédula</dt>
              <dd className="text-navy text-right">{shippingData?.idNumber}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Celular</dt>
              <dd className="text-navy text-right">{shippingData?.phoneNumber}</dd>
            </div>
            {shippingData?.shippingMethod === 'mrw' && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Oficina</dt>
                <dd className="text-navy text-right">
                  {shippingData.mrwOffice}, {shippingData.mrwState}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-navy">Pago</h3>
          </div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Método</dt>
              <dd className="text-navy font-medium text-right flex items-center justify-end gap-1">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                {paymentLabel}
              </dd>
            </div>
            {paymentData?.paymentMethod !== 'binancepay' && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Banco</dt>
                  <dd className="text-navy text-right">{paymentData?.bank}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Cédula titular</dt>
                  <dd className="text-navy text-right">{paymentData?.holderIdNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Teléfono</dt>
                  <dd className="text-navy text-right">{paymentData?.holderPhone}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Referencia</dt>
                  <dd className="text-navy font-mono text-right">{paymentData?.referenceNumber}</dd>
                </div>
              </>
            )}
            {paymentData?.paymentMethod === 'binancepay' && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Order ID Binance</dt>
                  <dd className="text-navy font-mono text-right">{paymentData.referenceNumber}</dd>
                </div>
                <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                  Tras confirmar, MundoTech revisará la captura y tu pago en Binance antes de descontar stock.
                </p>
              </>
            )}
          </dl>
          {paymentData?.proofImageUrl ? (
            <div className="mt-3">
              <p className="text-[11px] text-slate-500 mb-1.5">Captura adjunta</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paymentData.proofImageUrl}
                alt="Comprobante"
                className="w-24 h-24 object-cover rounded-xl border border-slate-200"
              />
            </div>
          ) : null}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm px-4 py-3">{error}</p>
      )}

      <div
        className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:pt-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
      <button
        type="button"
        onClick={handleConfirmOrder}
        disabled={isProcessing || cart.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 bg-navy text-white font-bold text-sm min-h-[52px] rounded-2xl hover:bg-navy-700 active:scale-[0.98] shadow-soft hover:shadow-card transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Enviando pedido…
          </>
        ) : (
          <>Confirmar pedido — {formatCurrency(total)}</>
        )}
      </button>
      </div>
    </div>
  );
};

export default ReviewStep;
