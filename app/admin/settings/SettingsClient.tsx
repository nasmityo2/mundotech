'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Store, Phone, Building2,
  Save, Check, DollarSign, RefreshCw, TrendingUp, Share2, Wallet,
} from 'lucide-react';
import { updateSettings } from '@/app/actions/settingsActions';
import { updateExchangeRate } from '@/app/actions/configActions';
import type { StoreSettings } from '@/lib/data-store';

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

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-navy/30 focus:border-navy"
      />
    </div>
  );
}

export default function SettingsClient({ initial }: { initial: StoreSettings }) {
  const router = useRouter();

  const [settings, setSettings] = useState<StoreSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [newRate, setNewRate] = useState('');
  const [rateMsg, setRateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isUpdatingRate, startRateTransition] = useTransition();

  useEffect(() => {
    fetch('/api/config/exchange-rate')
      .then(r => r.json())
      .then(data => { setCurrentRate(data.rate); setNewRate(data.rate.toString()); })
      .catch(() => {});
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
    try {
      const result = await updateSettings(settings);
      if (result.success) {
        setSaved(true);
        if (result.data) setSettings(result.data);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        alert(result.message);
      }
    } catch {
      alert('Error de conexión.');
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

        <SectionCard title="Tasa de Cambio USD / Bs" icon={TrendingUp} accent>
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <DollarSign size={18} className="text-yellow-700 flex-shrink-0" />
            <div>
              <p className="text-xs text-yellow-700 font-medium">Tasa actual en BD</p>
              <p className="text-lg font-bold text-yellow-900">
                {currentRate !== null ? `Bs. ${currentRate.toFixed(2)} / USD` : '—'}
              </p>
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

        <SectionCard title="Información de la Tienda" icon={Store}>
          <Field label="Nombre de la tienda" value={settings.storeName} onChange={v => set(['storeName'], v)} placeholder="MundoTech" />
          <Field label="Eslogan / Tagline" value={settings.tagline ?? ''} onChange={v => set(['tagline'], v)} placeholder="Tu tienda de tecnología en Venezuela." />
          <Field label="Dirección / Ubicación" value={settings.address ?? ''} onChange={v => set(['address'], v)} placeholder="Barquisimeto, Lara — Venezuela" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono principal" value={settings.phone} onChange={v => set(['phone'], v)} type="tel" placeholder="0412-1471338" />
            <Field label="Teléfono secundario" value={settings.phone2 ?? ''} onChange={v => set(['phone2'], v)} type="tel" placeholder="0414-5709470" />
          </div>
          <Field label="Correo electrónico" value={settings.email} onChange={v => set(['email'], v)} type="email" placeholder="ventas@mundotechve.com" />
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
          <Field label="Banco" value={settings.pagoMovil.bank} onChange={v => set(['pagoMovil', 'bank'], v)} placeholder="Banesco" />
          <Field label="Teléfono" value={settings.pagoMovil.phone} onChange={v => set(['pagoMovil', 'phone'], v)} type="tel" placeholder="0412-1234567" />
          <Field label="Cédula" value={settings.pagoMovil.idNumber} onChange={v => set(['pagoMovil', 'idNumber'], v)} placeholder="V-12.345.678" />
        </SectionCard>

        <SectionCard title="Transferencia Bancaria" icon={Building2}>
          <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 font-medium">
            Datos mostrados al cliente cuando elige &ldquo;Transferencia Bancaria&rdquo; en el checkout.
          </div>
          <Field label="Banco" value={settings.transferencia.bank} onChange={v => set(['transferencia', 'bank'], v)} placeholder="Mercantil" />
          <Field label="Número de cuenta" value={settings.transferencia.accountNumber} onChange={v => set(['transferencia', 'accountNumber'], v)} placeholder="0105-0000-00-1234567890" />
          <Field label="Titular" value={settings.transferencia.accountHolder} onChange={v => set(['transferencia', 'accountHolder'], v)} placeholder="Empresa Ejemplo C.A." />
          <Field label="RIF" value={settings.transferencia.rif} onChange={v => set(['transferencia', 'rif'], v)} placeholder="J-12345678-9" />
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
          <Field
            label="URL del código QR (imagen pública)"
            value={settings.binanceQrUrl ?? ''}
            onChange={v => set(['binanceQrUrl'], v)}
            placeholder="https://..."
            type="url"
          />
        </SectionCard>

      </div>
    </div>
  );
}
