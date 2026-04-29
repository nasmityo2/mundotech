'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Building, ChevronRight, Copy, Check, UploadCloud, X, Loader2, Wallet } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

export type PaymentMethod = 'pagomovil' | 'transferencia' | 'binancepay';

export type PaymentFormData = {
  paymentMethod:      PaymentMethod;
  bank:               string;
  holderIdNumber:     string;
  holderPhone:        string;
  referenceNumber:    string;
  proofImageUrl:      string;
};

interface PaymentFormProps {
  onPaymentSubmit: (data: PaymentFormData) => void;
  onBack: () => void;
}

const BINANCE_PAY_ID = process.env.NEXT_PUBLIC_MUNDOTECH_BINANCE_PAY_ID?.trim() ?? '';
const BINANCE_QR_URL = process.env.NEXT_PUBLIC_MUNDOTECH_BINANCE_QR_URL?.trim() ?? '';

// ── Datos de la tienda para recibir pagos ──────────────────────────────────────
const STORE_PAYMENT = {
  pagomovil: [
    { label: 'Banco',     value: 'Banesco' },
    { label: 'Teléfono',  value: '0412-1234567' },
    { label: 'Cédula',    value: 'V-12.345.678' },
  ],
  transferencia: [
    { label: 'Banco',    value: 'Banco Mercantil' },
    { label: 'Cuenta',   value: '0105-0000-00-1234567890' },
    { label: 'Titular',  value: 'MundoTech C.A.' },
    { label: 'RIF',      value: 'J-123456789' },
  ],
};

// ── Lista de bancos venezolanos ────────────────────────────────────────────────
export const VENEZUELAN_BANKS = [
  'Banco de Venezuela',
  'Banesco',
  'Banco Mercantil',
  'BBVA Provincial',
  'Banco Exterior',
  'BNC (Banco Nacional de Crédito)',
  'Bancaribe',
  'Bancrecer',
  'Banplus',
  'Banco del Tesoro',
  'Banco Bicentenario del Pueblo',
  'Mi Banco',
  'Banco Activo',
  'Venezolano de Crédito',
  'Banco Fondo Común (BFC)',
  'Delsur',
  'Banco Plaza',
  '100% Banco',
  'Banco Sofitasa',
  'Banco de la Fuerza Armada (BANFANB)',
  'Otro',
];

const selectCls =
  'block w-full min-h-[48px] px-3.5 text-base bg-slate-50/70 border border-slate-200 rounded-xl text-navy focus:outline-none focus:bg-white focus:border-navy';

const PaymentForm = ({ onPaymentSubmit }: PaymentFormProps) => {
  const [selected,        setSelected]        = useState<PaymentMethod | null>(null);
  const [copiedField,     setCopiedField]      = useState<string | null>(null);
  const [bank,            setBank]             = useState('');
  const [holderIdNumber,  setHolderIdNumber]   = useState('');
  const [holderPhone,     setHolderPhone]      = useState('');
  const [referenceNumber, setReferenceNumber]  = useState('');
  const [proofImageUrl,   setProofImageUrl]    = useState('');
  const [uploadError,     setUploadError]      = useState<string | null>(null);
  const [uploading,       setUploading]        = useState(false);
  const [errors,          setErrors]           = useState<Partial<Record<keyof PaymentFormData, string>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(value);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

  const uploadProof = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'payment');
      const res  = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Error al subir el comprobante.');
      setProofImageUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setUploading(false);
    }
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!selected) e.paymentMethod = 'Selecciona un método de pago.';
    if (selected === 'binancepay') {
      if (!referenceNumber.trim()) {
        e.referenceNumber = 'Ingresa el Order ID o referencia que muestra Binance.';
      }
      if (!proofImageUrl) e.proofImageUrl = 'Sube la captura de pantalla del pago.';
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (!bank) e.bank = 'Selecciona tu banco.';
    if (!holderIdNumber.trim()) e.holderIdNumber = 'Ingresa la cédula del titular.';
    if (!holderPhone.trim()) e.holderPhone = 'Ingresa el teléfono.';
    if (!referenceNumber.trim()) e.referenceNumber = 'Ingresa el número de referencia.';
    if (!proofImageUrl) e.proofImageUrl = 'Sube el comprobante de pago.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selected) return;
    if (selected === 'binancepay') {
      onPaymentSubmit({
        paymentMethod: 'binancepay',
        bank: 'Binance',
        holderIdNumber: '',
        holderPhone: '',
        referenceNumber,
        proofImageUrl,
      });
      return;
    }
    onPaymentSubmit({
      paymentMethod: selected,
      bank,
      holderIdNumber,
      holderPhone,
      referenceNumber,
      proofImageUrl,
    });
  };

  const storeData =
    selected && selected !== 'binancepay' ? STORE_PAYMENT[selected as 'pagomovil' | 'transferencia'] : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div>
        <h2 className="text-xl font-semibold text-navy tracking-tight">Método de pago</h2>
        <p className="text-sm text-slate-500 mt-1">Selecciona cómo vas a pagar y sube tu comprobante.</p>
      </div>

      {/* ── Cards de método ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(
          [
            { id: 'pagomovil' as const, icon: Smartphone, label: 'Pago Móvil', sub: 'Transfiere desde tu app bancaria' },
            { id: 'transferencia' as const, icon: Building, label: 'Transferencia', sub: 'Transferencia bancaria nacional' },
            {
              id: 'binancepay' as const,
              icon: Wallet,
              label: 'Binance',
              sub: 'Paga a nuestra cuenta y sube captura + Order ID',
            },
          ] as const
        ).map((m) => {
          const isActive = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { setSelected(m.id); setErrors({}); }}
              className={`text-left rounded-2xl p-4 flex items-start gap-3 transition-all ${
                isActive
                  ? 'border-2 border-navy bg-slate-50 shadow-soft'
                  : 'border border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isActive ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <m.icon size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy">{m.label}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">{m.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
      {errors.paymentMethod && (
        <p className="text-xs text-rose-500 -mt-4">{errors.paymentMethod}</p>
      )}

      {/* ── Datos de la tienda para pagar ── */}
      <AnimatePresence mode="wait">
        {storeData && selected !== 'binancepay' && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="bg-navy/5 border border-navy/10 rounded-2xl p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Transfiere a estos datos de MundoTech
            </p>
            <dl className="space-y-2">
              {storeData.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-slate-500 shrink-0">{row.label}</dt>
                  <dd className="flex items-center gap-2 font-mono text-navy text-[13px] text-right">
                    {row.value}
                    <button
                      type="button"
                      onClick={() => handleCopy(row.value)}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-navy transition-colors"
                      aria-label={`Copiar ${row.label}`}
                    >
                      {copiedField === row.value
                        ? <Check size={12} className="text-emerald-500" />
                        : <Copy size={12} />}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {selected === 'binancepay' && (
          <motion.div
            key="binance-static"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border border-[#F0B90B]/50 bg-gradient-to-br from-amber-50/90 to-white p-5 space-y-4"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Paga a MundoTech en Binance
              </p>
              {BINANCE_PAY_ID ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-[11px] text-slate-500">Binance ID / Pay ID</p>
                    <p className="font-mono text-sm font-semibold text-navy break-all">{BINANCE_PAY_ID}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(BINANCE_PAY_ID)}
                    className="shrink-0 p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                    aria-label="Copiar Binance ID"
                  >
                    {copiedField === BINANCE_PAY_ID ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-100/80 rounded-lg px-3 py-2">
                  Configura <span className="font-mono">NEXT_PUBLIC_MUNDOTECH_BINANCE_PAY_ID</span> en el servidor con
                  tu ID de recepción en Binance.
                </p>
              )}
              {BINANCE_QR_URL ? (
                <div className="mt-3 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BINANCE_QR_URL}
                    alt="Código QR Binance MundoTech"
                    className="w-36 h-36 rounded-xl border border-slate-200 bg-white object-contain"
                  />
                </div>
              ) : null}
              <p className="text-[12px] text-slate-600 mt-3 leading-relaxed">
                Envía el monto del pedido desde Binance a la cuenta indicada. Luego completa los datos abajo: el{' '}
                <strong>Order ID</strong> que muestra Binance y una <strong>captura</strong> del pago. MundoTech
                verificará el movimiento antes de preparar el envío.
              </p>
            </div>
            <div className="border-t border-amber-200/60 pt-4 space-y-4">
              <Field
                id="binanceReference"
                label="Order ID / referencia en Binance"
                error={errors.referenceNumber}
              >
                <Input
                  id="binanceReference"
                  placeholder="Ej. orden mostrada en historial o comprobante"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  invalid={!!errors.referenceNumber}
                />
              </Field>
              <div>
                <p className="text-sm font-semibold text-navy mb-2">
                  Captura del pago <span className="text-rose-500">*</span>
                </p>
                <p className="text-[12px] text-slate-500 mb-3">
                  Sube la captura de pantalla donde se vea el envío y el monto.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProof(file);
                    e.target.value = '';
                  }}
                />
                {proofImageUrl ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofImageUrl}
                      alt="Captura Binance"
                      className="w-40 h-40 object-cover rounded-xl border border-slate-200 shadow-soft"
                    />
                    <button
                      type="button"
                      onClick={() => setProofImageUrl('')}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow"
                      aria-label="Eliminar captura"
                    >
                      <X size={12} />
                    </button>
                    <p className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check size={11} /> Captura cargada
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-navy/40 hover:bg-slate-100 rounded-xl py-5 text-sm font-medium text-slate-600 transition disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Subiendo…
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} /> Subir captura
                      </>
                    )}
                  </button>
                )}
                {uploadError && <p className="mt-1.5 text-xs text-rose-500">{uploadError}</p>}
                {errors.proofImageUrl && !proofImageUrl && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.proofImageUrl}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Datos del comprobante ── */}
      {selected && selected !== 'binancepay' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-navy mb-4">Datos de tu transferencia</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Banco origen */}
              <div className="sm:col-span-2">
                <Field id="bank" label="Banco desde donde transferiste" error={errors.bank}>
                  <select
                    id="bank"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Selecciona tu banco…</option>
                    {VENEZUELAN_BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Cédula del titular */}
              <Field id="holderIdNumber" label="Cédula del titular de la cuenta" error={errors.holderIdNumber}>
                <Input
                  id="holderIdNumber"
                  placeholder="V-12345678"
                  value={holderIdNumber}
                  onChange={(e) => setHolderIdNumber(e.target.value)}
                  invalid={!!errors.holderIdNumber}
                />
              </Field>

              {/* Teléfono titular */}
              <Field id="holderPhone" label="Teléfono del titular" error={errors.holderPhone}>
                <Input
                  id="holderPhone"
                  type="tel"
                  placeholder="0412-0000000"
                  value={holderPhone}
                  onChange={(e) => setHolderPhone(e.target.value)}
                  invalid={!!errors.holderPhone}
                />
              </Field>

              {/* Número de referencia */}
              <div className="sm:col-span-2">
                <Field id="referenceNumber" label="Número de referencia de la operación" error={errors.referenceNumber}>
                  <Input
                    id="referenceNumber"
                    placeholder="Ej. 009432871"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    invalid={!!errors.referenceNumber}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Subida del comprobante ── */}
          <div>
            <p className="text-sm font-semibold text-navy mb-2">
              Comprobante de pago{' '}
              <span className="text-rose-500">*</span>
            </p>
            <p className="text-[12px] text-slate-500 mb-3">
              Sube una captura de pantalla o foto de la transferencia / pago móvil.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadProof(file);
                e.target.value = '';
              }}
            />

            {proofImageUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofImageUrl}
                  alt="Comprobante"
                  className="w-40 h-40 object-cover rounded-xl border border-slate-200 shadow-soft"
                />
                <button
                  type="button"
                  onClick={() => setProofImageUrl('')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow"
                  aria-label="Eliminar comprobante"
                >
                  <X size={12} />
                </button>
                <p className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={11} /> Comprobante cargado
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-navy/40 hover:bg-slate-100 rounded-xl py-5 text-sm font-medium text-slate-600 transition disabled:opacity-60"
              >
                {uploading
                  ? <><Loader2 size={15} className="animate-spin" /> Subiendo…</>
                  : <><UploadCloud size={16} /> Subir comprobante</>}
              </button>
            )}

            {uploadError && (
              <p className="mt-1.5 text-xs text-rose-500">{uploadError}</p>
            )}
            {errors.proofImageUrl && !proofImageUrl && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.proofImageUrl}</p>
            )}
          </div>
        </motion.div>
      )}

      <div
        className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:pt-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="submit"
          disabled={!selected}
          className="inline-flex w-full items-center justify-center gap-2 bg-brand-yellow text-navy font-bold text-sm min-h-[52px] rounded-2xl hover:bg-[#FFE03A] active:scale-[0.98] shadow-soft hover:shadow-card transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Revisar pedido <ChevronRight size={16} />
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;
