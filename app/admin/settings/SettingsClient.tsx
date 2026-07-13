'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Store, Phone, Building2,
  Save, Check, DollarSign, RefreshCw, TrendingUp, Share2, Wallet, Calculator, Printer,
  Truck, Plus, Trash2,
} from 'lucide-react';
import { updateSettings, updateShippingEstimates } from '@/app/actions/settingsActions';
import { updateExchangeRate, updatePricingParams, getPricingParams } from '@/app/actions/configActions';
import { recalculateAllProductPrices } from '@/app/actions/productActions';
import type { StoreSettings } from '@/lib/data-store';
import type { ShippingEstimates } from '@/lib/shipping-estimates';
import { mrwOffices } from '@/lib/mrw-offices';
import PhotoUploader from '@/components/admin/PhotoUploader';

/** Estados con cobertura (mismas llaves que usa el checkout MRW). */
const VE_STATES = Object.keys(mrwOffices).sort();

function SectionCard({ title, icon: Icon, children, accent }: {
  title: string; icon: React.ElementType; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-sm ${accent ? 'border-brand-yellow border-2' : 'border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-6 py-4 border-b ${accent ? 'bg-brand-yellow/10 border-yellow-200' : 'border-gray-100'}`}>
        <Icon size={17} className={accent ? 'text-yellow-700' : 'text-navy'} />
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

// ADM-06: inputs táctiles (min-h 48px, operador en móvil) + error inline por campo.
function Field({ label, value, onChange, type = 'text', placeholder, error }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`w-full px-3 py-2 min-h-[48px] rounded-lg border bg-gray-50 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200'
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
    </div>
  );
}

function formatBcvDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SettingsClient({
  initial,
  initialEstimates,
  bcvDate,
}: {
  initial: StoreSettings;
  initialEstimates: ShippingEstimates;
  bcvDate: string | null;
}) {
  const router = useRouter();

  const [settings, setSettings] = useState<StoreSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // ADM-06: errores Zod por campo ("pagoMovil.bank") + mensaje global visible.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const fieldError = (path: string) => fieldErrors[path];

  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [newRate, setNewRate] = useState('');
  const [rateMsg, setRateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isUpdatingRate, startRateTransition] = useTransition();

  // MEJORA 2.3: estimados de envío (tabla por método + overrides por estado).
  const [estimates, setEstimates] = useState<ShippingEstimates>(initialEstimates);
  const [estimatesMsg, setEstimatesMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSavingEstimates, startEstimatesTransition] = useTransition();

  const [marginPct, setMarginPct] = useState('');
  const [factor, setFactor] = useState('');
  const [pricingMsg, setPricingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSavingPricing, startPricingTransition] = useTransition();
  const [isRecalculating, startRecalcTransition] = useTransition();
  const [recalcMsg, setRecalcMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    // RUN-12: validar res.ok — antes un 500 dejaba los campos vacíos sin traza.
    fetch('/api/config/exchange-rate')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(data => {
        if (typeof data?.rate === 'number') {
          setCurrentRate(data.rate);
          setNewRate(data.rate.toString());
        }
      })
      .catch(err => {
        console.error('[admin/settings] error cargando tasa:', err);
        setRateMsg({ ok: false, text: 'No se pudo cargar la tasa actual. Recarga la página.' });
      });
  }, []);

  useEffect(() => {
    getPricingParams()
      .then(({ marginPct, factor }) => { setMarginPct(String(marginPct)); setFactor(String(factor)); })
      .catch(err => console.error('[admin/settings] error cargando fórmula:', err));
  }, []);

  const set = (path: string[], value: string) => {
    setSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as StoreSettings;
      let obj: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] as Record<string, unknown>;
      obj[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      const result = await updateSettings(settings);
      if (result.success) {
        setSaved(true);
        if (result.data) setSettings(result.data);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        setSaveError(result.message);
        if (result.errors) {
          const flat: Record<string, string> = {};
          for (const [path, msgs] of Object.entries(result.errors)) {
            if (msgs[0]) flat[path] = msgs[0];
          }
          setFieldErrors(flat);
        }
      }
    } catch (err) {
      console.error('[admin/settings] error guardando:', err);
      setSaveError('Error de conexión. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRateUpdate = () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      setRateMsg({ ok: false, text: 'Ingresa un número positivo válido.' });
      return;
    }
    startRateTransition(async () => {
      const result = await updateExchangeRate(rate);
      setRateMsg({ ok: result.success, text: result.message });
      if (result.success) {
        setCurrentRate(rate);
        router.refresh();
      }
      setTimeout(() => setRateMsg(null), 4000);
    });
  };

  const handlePricingUpdate = () => {
    startPricingTransition(async () => {
      const result = await updatePricingParams({ marginPct, factor });
      setPricingMsg({ ok: result.success, text: result.message });
      if (result.success) router.refresh();
      setTimeout(() => setPricingMsg(null), 4000);
    });
  };

  const handleRecalc = () => {
    if (!window.confirm('Esto recalculará el precio de TODOS los productos con costo, usando la tasa actual y el margen guardado de cada producto. Las ofertas conservan su % de descuento, y los productos con precio manual (sin costo) no se tocan. ¿Continuar?')) return;
    startRecalcTransition(async () => {
      const result = await recalculateAllProductPrices();
      setRecalcMsg({ ok: result.success, text: result.message });
      if (result.success) router.refresh();
      setTimeout(() => setRecalcMsg(null), 6000);
    });
  };

  const handleSaveEstimates = () => {
    startEstimatesTransition(async () => {
      const cleaned: ShippingEstimates = {
        ...estimates,
        states: estimates.states.filter(s => s.state.trim() && s.note.trim()),
      };
      const result = await updateShippingEstimates(cleaned);
      setEstimatesMsg({ ok: result.success, text: result.message });
      if (result.success && result.data) setEstimates(result.data);
      setTimeout(() => setEstimatesMsg(null), 4000);
    });
  };

  const LABEL_PRESETS: { id: string; label: string; w: number; h: number }[] = [
    { id: 'thermal', label: 'Térmica 100×150 mm (4×6")', w: 100, h: 150 },
    { id: 'letter',  label: 'Hoja Carta 216×279 mm',     w: 216, h: 279 },
    { id: 'a4',      label: 'Hoja A4 210×297 mm',         w: 210, h: 297 },
  ];
  const curLabelW = Number(settings.labelWidthMm) || 100;
  const curLabelH = Number(settings.labelHeightMm) || 150;
  const activeLabelPreset = LABEL_PRESETS.find(p => p.w === curLabelW && p.h === curLabelH)?.id ?? 'custom';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={22} className="text-navy" /> Configuración
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Datos de la tienda, pagos y tasa cambiaria.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-brand-yellow border border-yellow-400 text-navy font-black uppercase tracking-wide hover:bg-yellow-300 disabled:opacity-60'
          }`}
        >
          {saved ? <><Check size={16} /> Guardado</> : saving ? 'Guardando...' : <><Save size={16} /> Guardar Cambios</>}
        </button>
      </div>

      <div className="space-y-6 max-w-2xl">

        {saveError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {saveError}
          </div>
        )}

        <SectionCard title="Tasa de Cambio USD / Bs" icon={TrendingUp} accent>
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <DollarSign size={18} className="text-yellow-700 flex-shrink-0" />
            <div>
              <p className="text-xs text-yellow-700 font-medium">Tasa actual en BD</p>
              <p className="text-lg font-bold text-yellow-900">
                {currentRate !== null ? `Bs. ${currentRate.toFixed(2)} / USD` : '—'}
              </p>
              {bcvDate && (
                <p className="text-xs text-yellow-600 mt-0.5">
                  Tasa BCV del {formatBcvDate(bcvDate)}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Al guardar, la nueva tasa se aplica globalmente a toda la tienda de forma inmediata
            (revalidación del caché).
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              placeholder="Ej: 40.50"
              className="flex-1 px-3 py-2 border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy"
            />
            <button
              type="button"
              onClick={handleRateUpdate}
              disabled={isUpdatingRate}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-60 transition"
            >
              <RefreshCw size={15} className={isUpdatingRate ? 'animate-spin' : ''} />
              {isUpdatingRate ? 'Actualizando...' : 'Aplicar'}
            </button>
          </div>
          {rateMsg && (
            <p className={`text-sm font-medium ${rateMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {rateMsg.text}
            </p>
          )}
        </SectionCard>

        <SectionCard title="Fórmula de precios (costo → venta)" icon={Calculator}>
          <p className="text-xs text-gray-500">
            precio = costo × (1 + margen del producto/100) × tasa actual.
            El margen de ganancia se define en cada producto (varía según el producto); aquí solo se
            ajusta la tasa actual.
          </p>
          <Field
            label="Tasa actual"
            value={factor}
            onChange={setFactor}
            type="number"
            placeholder="1.5"
          />
          <button
            type="button"
            onClick={handlePricingUpdate}
            disabled={isSavingPricing}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-60 transition"
          >
            <RefreshCw size={15} className={isSavingPricing ? 'animate-spin' : ''} />
            {isSavingPricing ? 'Actualizando...' : 'Aplicar'}
          </button>
          {pricingMsg && (
            <p className={`text-sm font-medium ${pricingMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {pricingMsg.text}
            </p>
          )}
          <div className="pt-3 mt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">
              ¿Subiste la tasa actual? Aplícala arriba y luego recalcula los productos que ya tienes en venta.
              Cada producto se recalcula con su propio margen de ganancia guardado. Solo afecta productos con costo; las ofertas conservan su descuento.
            </p>
            <button
              type="button"
              onClick={handleRecalc}
              disabled={isRecalculating}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-navy/30 text-navy text-sm font-semibold rounded-lg hover:bg-navy/5 disabled:opacity-60 transition"
            >
              <RefreshCw size={15} className={isRecalculating ? 'animate-spin' : ''} />
              {isRecalculating ? 'Recalculando…' : 'Recalcular precios de todos los productos'}
            </button>
            {recalcMsg && (
              <p className={`text-sm font-medium mt-2 ${recalcMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {recalcMsg.text}
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Información de la Tienda" icon={Store}>
          <Field label="Nombre de la tienda" value={settings.storeName} onChange={v => set(['storeName'], v)} placeholder="MundoTech" error={fieldError('storeName')} />
          <Field label="Eslogan / Tagline" value={settings.tagline ?? ''} onChange={v => set(['tagline'], v)} placeholder="Tu tienda de tecnología en Venezuela." />
          <Field label="Dirección / Ubicación" value={settings.address ?? ''} onChange={v => set(['address'], v)} placeholder="Barquisimeto, Lara — Venezuela" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono principal" value={settings.phone} onChange={v => set(['phone'], v)} type="tel" placeholder="0412-1471338" error={fieldError('phone')} />
            <Field label="Teléfono secundario" value={settings.phone2 ?? ''} onChange={v => set(['phone2'], v)} type="tel" placeholder="0414-5709470" />
          </div>
          <Field label="Correo electrónico" value={settings.email} onChange={v => set(['email'], v)} type="email" placeholder="ventas@mundotechve.com" error={fieldError('email')} />
        </SectionCard>

        <SectionCard title="Etiqueta de envío" icon={Printer}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño rápido</label>
            <select
              value={activeLabelPreset}
              onChange={e => {
                const p = LABEL_PRESETS.find(x => x.id === e.target.value);
                if (p) { set(['labelWidthMm'], String(p.w)); set(['labelHeightMm'], String(p.h)); }
              }}
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy"
            >
              {LABEL_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ancho (mm)" type="number" value={String(settings.labelWidthMm ?? '')} onChange={v => set(['labelWidthMm'], v)} placeholder="100" />
            <Field label="Alto (mm)"  type="number" value={String(settings.labelHeightMm ?? '')} onChange={v => set(['labelHeightMm'], v)} placeholder="150" />
          </div>
          <p className="text-xs text-gray-500">
            Térmica estándar = 100×150 mm. Cuando imprimas en hoja normal, elige Carta o A4.
            La etiqueta se mantiene compacta arriba a la izquierda de la hoja.
          </p>
        </SectionCard>

        <SectionCard title="Redes Sociales" icon={Share2}>
          <p className="text-xs text-gray-500">URL completa de tus perfiles. Aparecen en el Footer de la tienda.</p>
          <Field label="Instagram (URL)" value={settings.instagram ?? ''} onChange={v => set(['instagram'], v)} type="url" placeholder="https://instagram.com/mundotech" />
          <Field label="Facebook (URL)" value={settings.facebook ?? ''} onChange={v => set(['facebook'], v)} type="url" placeholder="https://facebook.com/mundotech" />
        </SectionCard>

        <SectionCard title="Pago Móvil" icon={Phone}>
          <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-navy font-medium">
            Datos mostrados al cliente cuando elige &ldquo;Pago Móvil&rdquo; en el checkout.
          </div>
          <Field label="Banco" value={settings.pagoMovil.bank} onChange={v => set(['pagoMovil', 'bank'], v)} placeholder="Banesco" error={fieldError('pagoMovil.bank')} />
          <Field label="Teléfono" value={settings.pagoMovil.phone} onChange={v => set(['pagoMovil', 'phone'], v)} type="tel" placeholder="0412-1234567" error={fieldError('pagoMovil.phone')} />
          <Field label="Cédula" value={settings.pagoMovil.idNumber} onChange={v => set(['pagoMovil', 'idNumber'], v)} placeholder="V-12.345.678" error={fieldError('pagoMovil.idNumber')} />
        </SectionCard>

        <SectionCard title="Transferencia Bancaria" icon={Building2}>
          <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 font-medium">
            Datos mostrados al cliente cuando elige &ldquo;Transferencia Bancaria&rdquo; en el checkout.
          </div>
          <Field label="Banco" value={settings.transferencia.bank} onChange={v => set(['transferencia', 'bank'], v)} placeholder="Mercantil" error={fieldError('transferencia.bank')} />
          <Field label="Número de cuenta" value={settings.transferencia.accountNumber} onChange={v => set(['transferencia', 'accountNumber'], v)} placeholder="0105-0000-00-1234567890" error={fieldError('transferencia.accountNumber')} />
          <Field label="Titular" value={settings.transferencia.accountHolder} onChange={v => set(['transferencia', 'accountHolder'], v)} placeholder="Empresa Ejemplo C.A." error={fieldError('transferencia.accountHolder')} />
          <Field label="RIF" value={settings.transferencia.rif} onChange={v => set(['transferencia', 'rif'], v)} placeholder="J-12345678-9" error={fieldError('transferencia.rif')} />
        </SectionCard>

        {/* MEJORA 2.3: estimados de envío visibles en el paso de envío del checkout */}
        <SectionCard title="Estimados de envío" icon={Truck}>
          <p className="text-xs text-gray-500">
            Texto que ve el cliente al elegir el método de envío (tiempo estimado y costo aproximado).
            Deja vacío lo que no quieras mostrar. Ejemplo: «2–4 días hábiles · lo pagas al recibir (~$3–6 según destino)».
          </p>
          <Field
            label="Retiro en tienda"
            value={estimates.tienda}
            onChange={v => setEstimates(p => ({ ...p, tienda: v }))}
            placeholder="Listo el mismo día · te avisamos por WhatsApp"
          />
          <Field
            label="MRW (nota general)"
            value={estimates.mrw}
            onChange={v => setEstimates(p => ({ ...p, mrw: v }))}
            placeholder="2–4 días hábiles · lo pagas al recibir en la oficina"
          />
          <Field
            label="ZOOM (nota general)"
            value={estimates.zoom}
            onChange={v => setEstimates(p => ({ ...p, zoom: v }))}
            placeholder="2–5 días hábiles · lo pagas al recibir en la oficina"
          />
          <Field
            label="TEALCA (nota general)"
            value={estimates.tealca}
            onChange={v => setEstimates(p => ({ ...p, tealca: v }))}
            placeholder="2–5 días hábiles · lo pagas al recibir en la oficina"
          />

          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Excepciones por estado (opcional)</p>
            <div className="space-y-2">
              {estimates.states.map((row, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <select
                    value={row.state}
                    onChange={e => setEstimates(p => ({
                      ...p,
                      states: p.states.map((s, j) => j === i ? { ...s, state: e.target.value } : s),
                    }))}
                    className="w-[38%] px-2 py-2 min-h-[48px] rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-navy/30"
                    aria-label="Estado"
                  >
                    <option value="">Estado…</option>
                    {VE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="text"
                    value={row.note}
                    onChange={e => setEstimates(p => ({
                      ...p,
                      states: p.states.map((s, j) => j === i ? { ...s, note: e.target.value } : s),
                    }))}
                    placeholder="1–2 días hábiles"
                    className="flex-1 px-3 py-2 min-h-[48px] rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-navy/30"
                    aria-label="Estimado para el estado"
                  />
                  <button
                    type="button"
                    onClick={() => setEstimates(p => ({ ...p, states: p.states.filter((_, j) => j !== i) }))}
                    className="min-w-[44px] min-h-[48px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 active:bg-red-100"
                    aria-label="Quitar excepción"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEstimates(p => ({ ...p, states: [...p.states, { state: '', note: '' }] }))}
              disabled={estimates.states.length >= 30}
              className="mt-2 inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-gray-200 text-sm font-semibold text-navy hover:bg-gray-50 disabled:opacity-50"
            >
              <Plus size={15} /> Agregar estado
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveEstimates}
            disabled={isSavingEstimates}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-60 transition"
          >
            <Save size={15} />
            {isSavingEstimates ? 'Guardando…' : 'Guardar estimados'}
          </button>
          {estimatesMsg && (
            <p className={`text-sm font-medium ${estimatesMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {estimatesMsg.text}
            </p>
          )}
        </SectionCard>

        <SectionCard title="WhatsApp para pedidos" icon={Wallet}>
          <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 font-medium">
            Número de teléfono al que se enviarán los pedidos creados por WhatsApp.
            Formato internacional sin espacios, ej. 584121471338.
          </div>
          <Field
            label="Número de WhatsApp para pedidos"
            value={settings.whatsappOrderPhone ?? ''}
            onChange={v => set(['whatsappOrderPhone'], v)}
            type="tel"
            placeholder="584121471338"
          />
        </SectionCard>

        {/* PRD-027/130: Binance Pay configurable sin redeploy */}
        <SectionCard title="Binance Pay" icon={Wallet}>
          <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700 font-medium">
            Datos mostrados al cliente cuando elige &ldquo;Binance&rdquo; en el checkout.
            Deja ambos campos vacíos para ocultar este método de pago.
          </div>
          <Field
            label="Binance Pay ID / ID de recepción"
            value={settings.binancePayId ?? ''}
            onChange={v => set(['binancePayId'], v)}
            placeholder="Ej. 12345678"
          />
          <PhotoUploader
            label="Código QR de Binance Pay"
            hint="Sube PNG, JPG o WEBP. Se guarda en R2 público; no se aceptan URLs externas."
            value={settings.binanceQrUrl ?? ''}
            onChange={(url) => set(['binanceQrUrl'], url ?? '')}
            purpose="binance-qr"
            optional
            maxSizeMB={2}
            previewHeight="h-44"
          />
        </SectionCard>

      </div>
    </div>
  );
}
