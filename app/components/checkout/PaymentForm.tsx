'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Building, ChevronRight, Copy, Check, UploadCloud, X, Wallet } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import type { StoreSettings } from '@/lib/data-store';
import { VENEZUELAN_BANKS } from '@/lib/venezuela-banks';

export type PaymentMethod = 'pagomovil' | 'transferencia' | 'binancepay' | 'cashea';

export type PaymentFormData = {
  paymentMethod:      PaymentMethod;
  bank:               string;
  holderIdNumber:     string;
  holderPhone:        string;
  referenceNumber:    string;
  /**
   * PRD-049: el archivo se retiene localmente y se sube a R2 recién al
   * confirmar el pedido (ReviewStep). Antes se subía al seleccionarlo y cada
   * checkout abandonado dejaba imágenes huérfanas.
   */
  proofFile:          File | null;
  /** Object URL local solo para previsualizar la captura. */
  proofPreviewUrl:    string;
};

interface PaymentFormProps {
  onPaymentSubmit: (data: PaymentFormData) => void;
  /** Datos ya capturados: al volver desde Revisión el formulario se remonta y sin esto se perdía todo. */
  initialData?: PaymentFormData | null;
  /** Datos de pago de la tienda leídos desde el data-store en el Server Component padre. */
  pagoMovil: StoreSettings['pagoMovil'];
  transferencia: StoreSettings['transferencia'];
  /**
   * PRD-027/130: Binance Pay ID y QR URL desde readSettings() (Server Component
   * padre). Vacíos = Binance no está configurado → se oculta el método de pago.
   */
  binancePayId?: string;
  binanceQrUrl?: string;
  /** Modo WhatsApp: solo requiere método de pago, sin referencia ni comprobante. */
  whatsappMode?: boolean;
}

/** Límites espejo de /api/checkout/upload-proof para fallar temprano en cliente. */
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const selectCls =
  'block w-full min-h-[48px] px-3.5 text-base bg-slate-50/70 border border-slate-200 rounded-xl text-navy focus:outline-none focus:bg-white focus:border-navy';

const PaymentForm = ({ onPaymentSubmit, initialData, pagoMovil, transferencia, binancePayId = '', binanceQrUrl = '', whatsappMode = false }: PaymentFormProps) => {
  const [selected,        setSelected]        = useState<PaymentMethod | null>(initialData?.paymentMethod ?? null);
  const [copiedField,     setCopiedField]      = useState<string | null>(null);
  const [bank,            setBank]             = useState(initialData?.bank && initialData.bank !== 'Binance' ? initialData.bank : '');
  const [holderIdNumber,  setHolderIdNumber]   = useState(initialData?.holderIdNumber ?? '');
  const [holderPhone,     setHolderPhone]      = useState(initialData?.holderPhone ?? '');
  const [referenceNumber, setReferenceNumber]  = useState(initialData?.referenceNumber ?? '');
  const [proofFile,       setProofFile]        = useState<File | null>(initialData?.proofFile ?? null);
  const [proofPreviewUrl, setProofPreviewUrl]  = useState(initialData?.proofPreviewUrl ?? '');
  const [uploadError,     setUploadError]      = useState<string | null>(null);
  const [errors,          setErrors]           = useState<Partial<Record<'paymentMethod' | 'bank' | 'holderIdNumber' | 'holderPhone' | 'referenceNumber' | 'proofFile', string>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Nota: el object URL NO se revoca al desmontar — ReviewStep lo usa para
  // mostrar la captura adjunta y al volver atrás se restaura como preview.
  // Solo se libera al reemplazar/quitar la imagen (ver selectProof/clearProof).

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Safari iOS / WebViews sin permiso de clipboard: fallback clásico.
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopiedField(value);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const selectProof = useCallback((file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('El comprobante debe ser una imagen (JPG, PNG o WEBP).');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setUploadError(`La imagen supera el máximo permitido (${MAX_PROOF_BYTES / (1024 * 1024)} MB).`);
      return;
    }
    setProofFile(file);
    setProofPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const clearProof = useCallback(() => {
    setProofFile(null);
    setProofPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!selected) e.paymentMethod = 'Selecciona un método de pago.';
    if (whatsappMode) {
      // WhatsApp: solo requiere método seleccionado — no exige ref ni comprobante.
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (selected === 'cashea') {
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (selected === 'binancepay') {
      if (!referenceNumber.trim()) {
        e.referenceNumber = 'Ingresa el Order ID o referencia que muestra Binance.';
      }
      if (!proofFile) e.proofFile = 'Sube la captura de pantalla del pago.';
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (!bank) e.bank = 'Selecciona tu banco.';
    if (!holderIdNumber.trim()) e.holderIdNumber = 'Ingresa la cédula del titular.';
    if (!holderPhone.trim()) e.holderPhone = 'Ingresa el teléfono.';
    if (!referenceNumber.trim()) e.referenceNumber = 'Ingresa el número de referencia.';
    if (!proofFile) e.proofFile = 'Sube el comprobante de pago.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selected) return;
    if (whatsappMode) {
      // WhatsApp: envía método seleccionado sin referencia ni comprobante.
      onPaymentSubmit({
        paymentMethod: selected,
        bank: selected === 'pagomovil' || selected === 'transferencia' ? bank : '',
        holderIdNumber: '',
        holderPhone: '',
        referenceNumber: '',
        proofFile: null,
        proofPreviewUrl: '',
      });
      return;
    }
    if (selected === 'cashea') {
      onPaymentSubmit({
        paymentMethod: 'cashea',
        bank: '',
        holderIdNumber: '',
        holderPhone: '',
        referenceNumber: '',
        proofFile: null,
        proofPreviewUrl: '',
      });
      return;
    }
    if (selected === 'binancepay') {
      onPaymentSubmit({
        paymentMethod: 'binancepay',
        bank: 'Binance',
        holderIdNumber: '',
        holderPhone: '',
        referenceNumber,
        proofFile,
        proofPreviewUrl,
      });
      return;
    }
    onPaymentSubmit({
      paymentMethod: selected,
      bank,
      holderIdNumber,
      holderPhone,
      referenceNumber,
      proofFile,
      proofPreviewUrl,
    });
  };

  const isBankManual = selected === 'pagomovil' || selected === 'transferencia';

  const storeDataRows: { label: string; value: string }[] | null = (() => {
    if (!selected || selected === 'binancepay' || selected === 'cashea') return null;
    if (selected === 'pagomovil') {
      return [
        { label: 'Banco',    value: pagoMovil.bank },
        { label: 'Teléfono', value: pagoMovil.phone },
        { label: 'Cédula',   value: pagoMovil.idNumber },
      ];
    }
    return [
      { label: 'Banco',    value: transferencia.bank },
      { label: 'Cuenta',   value: transferencia.accountNumber },
      { label: 'Titular',  value: transferencia.accountHolder },
      { label: 'RIF',      value: transferencia.rif },
    ];
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div>
        <h2 className="text-xl font-semibold text-navy tracking-tight">Método de pago</h2>
        <p className="text-sm text-slate-500 mt-1">
          {whatsappMode
            ? 'Selecciona cómo vas a pagar. No necesitas subir comprobante ahora — lo coordinas por WhatsApp.'
            : 'Selecciona cómo vas a pagar y sube tu comprobante.'}
        </p>
      </div>

      {/* ── Cards de método ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(
          [
            { id: 'pagomovil' as const, icon: Phone, label: 'Pago Móvil', sub: 'Transfiere desde tu app bancaria' },
            { id: 'transferencia' as const, icon: Building, label: 'Transferencia', sub: 'Transferencia bancaria nacional' },
            // PRD-027/130: Binance solo aparece si el admin configuró el Pay ID.
            ...(binancePayId.trim()
              ? ([{
                  id: 'binancepay' as const,
                  icon: Wallet,
                  label: 'Binance',
                  sub: 'Paga a nuestra cuenta y sube captura + Order ID',
                }] as const)
              : []),
            { id: 'cashea' as const, icon: Wallet, label: 'Cashea', sub: 'Compra ahora y paga después — coordinamos por WhatsApp' },
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
        {storeDataRows && isBankManual && (
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
              {storeDataRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-slate-500 shrink-0">{row.label}</dt>
                  <dd className="flex items-center gap-1 font-mono text-navy text-[13px] text-right">
                    {row.value}
                    <button
                      type="button"
                      onClick={() => handleCopy(row.value)}
                      className="min-w-[44px] min-h-[44px] -my-3 -mr-2 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-navy transition-colors"
                      aria-label={`Copiar ${row.label}`}
                    >
                      {copiedField === row.value
                        ? <Check size={14} className="text-emerald-500" />
                        : <Copy size={14} />}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      {whatsappMode && isBankManual && (
        <p className="text-[12px] text-slate-600 leading-relaxed rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
          Realiza el pago a estos datos. Al confirmar el pedido, te llevaremos a WhatsApp para
          coordinar y enviar tu comprobante. No necesitas subirlo aquí.
        </p>
      )}

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
              {binancePayId.trim() ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-[11px] text-slate-500">Binance ID / Pay ID</p>
                    <p className="font-mono text-sm font-semibold text-navy break-all">{binancePayId.trim()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(binancePayId.trim())}
                    className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
                    aria-label="Copiar Binance ID"
                  >
                    {copiedField === binancePayId.trim() ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              ) : null}
              {binanceQrUrl.trim() ? (
                <div className="mt-3 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={binanceQrUrl.trim()}
                    alt="Código QR Binance MundoTech"
                    className="w-36 h-36 rounded-xl border border-slate-200 bg-white object-contain"
                  />
                </div>
              ) : null}
              <p className="text-[12px] text-slate-600 mt-3 leading-relaxed">
                {whatsappMode
                  ? 'Envía el monto del pedido desde Binance a la cuenta indicada. Al confirmar, coordinamos el pago y nos envías el Order ID y la captura por WhatsApp.'
                  : (<>Envía el monto del pedido desde Binance a la cuenta indicada. Luego completa los datos abajo: el <strong>Order ID</strong> que muestra Binance y una <strong>captura</strong> del pago. MundoTech verificará el movimiento antes de preparar el envío.</>)}
              </p>
            </div>
            {!whatsappMode && (
              <div className="border-t border-amber-200/60 pt-4 space-y-4">
              <Field
                id="binanceReference"
                label="Order ID / referencia en Binance"
                error={errors.referenceNumber}
              >
                <Input
                  id="binanceReference"
                  placeholder="Ej. orden mostrada en historial o comprobante"
                  autoComplete="off"
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
                    if (file) selectProof(file);
                    e.target.value = '';
                  }}
                />
                {proofPreviewUrl ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofPreviewUrl}
                      alt="Captura Binance"
                      className="w-40 h-40 object-cover rounded-xl border border-slate-200 shadow-soft"
                    />
                    <button
                      type="button"
                      onClick={clearProof}
                      className="absolute -top-4 -right-4 w-11 h-11 flex items-center justify-center"
                      aria-label="Eliminar captura"
                    >
                      <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow">
                        <X size={14} />
                      </span>
                    </button>
                    <p className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Check size={11} /> Captura lista — se envía al confirmar el pedido
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-navy/40 hover:bg-slate-100 rounded-xl py-5 text-sm font-medium text-slate-600 transition"
                  >
                    <UploadCloud size={16} /> Subir captura
                  </button>
                )}
                {uploadError && <p className="mt-1.5 text-xs text-rose-500">{uploadError}</p>}
                {errors.proofFile && !proofFile && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.proofFile}</p>
                )}
              </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Panel informativo Cashea ── */}
      <AnimatePresence mode="wait">
        {selected === 'cashea' && (
          <motion.div
            key="cashea-static"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border border-navy/20 bg-navy/5 p-5 space-y-2"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Paga con Cashea
            </p>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              Al confirmar tu pedido te mostraremos un botón para escribirnos por WhatsApp.
              Por ahí coordinamos tu compra con Cashea: generamos tu orden, pagas la inicial en tu app
              Cashea y, al confirmar el pago, preparamos tu envío. No necesitas subir comprobante aquí.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Datos del comprobante ── */}
      {isBankManual && !whatsappMode && (
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
                  autoComplete="off"
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
                  inputMode="tel"
                  autoComplete="tel"
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
                    inputMode="numeric"
                    autoComplete="off"
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
                if (file) selectProof(file);
                e.target.value = '';
              }}
            />

            {proofPreviewUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofPreviewUrl}
                  alt="Comprobante"
                  className="w-40 h-40 object-cover rounded-xl border border-slate-200 shadow-soft"
                />
                <button
                  type="button"
                  onClick={clearProof}
                  className="absolute -top-4 -right-4 w-11 h-11 flex items-center justify-center"
                  aria-label="Eliminar comprobante"
                >
                  <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow">
                    <X size={14} />
                  </span>
                </button>
                <p className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={11} /> Comprobante listo — se envía al confirmar el pedido
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-navy/40 hover:bg-slate-100 rounded-xl py-5 text-sm font-medium text-slate-600 transition"
              >
                <UploadCloud size={16} /> Subir comprobante
              </button>
            )}

            {uploadError && (
              <p className="mt-1.5 text-xs text-rose-500">{uploadError}</p>
            )}
            {errors.proofFile && !proofFile && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.proofFile}</p>
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
