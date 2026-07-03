'use client';

import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { Store, Building2, ChevronRight, BookUser, Check } from 'lucide-react';
import { mrwOffices } from '@/lib/mrw-offices';
import { zoomOffices, type ZoomOffice } from '@/lib/zoom-offices';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { getSavedAddresses } from '@/app/actions/addressActions';
import type { SavedAddress, ShippingMethod } from '@/lib/definitions';

export type ShippingFormData = {
  firstName:   string;
  lastName:    string;
  email:       string;
  idNumber:    string;
  phoneNumber: string;
  shippingMethod: ShippingMethod;
  mrwState?:  string;
  mrwOffice?: string;
  zoomState?: string;
  zoomOfficeIndex?: string;
};

interface ShippingFormProps {
  onFormSubmit: (data: ShippingFormData) => void;
  /** Datos ya capturados: al volver desde el paso de pago el formulario se remonta y sin esto se perdía lo escrito. */
  initialData?: ShippingFormData | null;
}

const ShippingForm = ({ onFormSubmit, initialData }: ShippingFormProps) => {
  const { data: session } = useSession();
  const {
    register, handleSubmit, formState: { errors }, watch, setValue,
  } = useForm<ShippingFormData>({
    defaultValues: initialData ?? { shippingMethod: 'tienda', email: '' },
  });

  const [savedAddresses, setSavedAddresses]   = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId]   = useState<string | null>(null);
  const [showAddrPicker, setShowAddrPicker]   = useState(false);
  const [loadingAddrs,   setLoadingAddrs]      = useState(false);

  useEffect(() => {
    if (initialData?.email) return;
    const e = session?.user?.email?.trim();
    if (e) setValue('email', e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email, setValue]);

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoadingAddrs(true);
    getSavedAddresses()
      .then((addrs) => {
        setSavedAddresses(addrs);
        // Solo auto-aplicar la dirección por defecto en la primera visita:
        // si venimos "de vuelta" desde el pago, respetar lo que ya escribió.
        if (initialData) return;
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (def) applyAddress(def);
      })
      .finally(() => setLoadingAddrs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  function applyAddress(addr: SavedAddress) {
    setValue('firstName',      addr.firstName);
    setValue('lastName',       addr.lastName);
    setValue('idNumber',       addr.idNumber);
    setValue('phoneNumber',    addr.phoneNumber);
    setValue('shippingMethod', addr.shippingMethod as ShippingMethod);
    if (addr.shippingMethod === 'mrw') {
      setValue('mrwState',  addr.mrwState  ?? '');
      setValue('mrwOffice', addr.mrwOffice ?? '');
      setValue('zoomState', '');
      setValue('zoomOfficeIndex', '');
    } else if (addr.shippingMethod === 'zoom') {
      setValue('mrwState', '');
      setValue('mrwOffice', '');
      setValue('zoomState', addr.mrwState ?? '');
      // Find the office index by matching the name
      if (addr.mrwState && addr.mrwOffice) {
        const offices = (zoomOffices as Record<string, ZoomOffice[]>)[addr.mrwState] ?? [];
        const idx = offices.findIndex(o => o.name === addr.mrwOffice);
        setValue('zoomOfficeIndex', idx >= 0 ? String(idx) : '');
      } else {
        setValue('zoomOfficeIndex', '');
      }
    } else {
      setValue('mrwState',  '');
      setValue('mrwOffice', '');
      setValue('zoomState', '');
      setValue('zoomOfficeIndex', '');
    }
    setSelectedAddrId(addr.id);
    setShowAddrPicker(false);
  }

  const shippingMethod = watch('shippingMethod');
  const selectedMrwState  = watch('mrwState');
  const selectedZoomState = watch('zoomState');

  const onSubmit: SubmitHandler<ShippingFormData> = (data) => onFormSubmit(data);

  const inputCls = "block w-full min-h-[48px] px-3.5 text-base bg-slate-50/70 border border-slate-200 rounded-xl text-navy focus:outline-none focus:bg-white focus:border-navy focus:shadow-ring-navy";

  const selectedAddr = savedAddresses.find((a) => a.id === selectedAddrId);

  // Zoom: las oficinas filtradas por estado seleccionado
  const zoomOfficesForState: ZoomOffice[] = selectedZoomState
    ? (zoomOffices as Record<string, ZoomOffice[]>)[selectedZoomState] ?? []
    : [];

  // Zoom: etiqueta para el <select>
  const zoomOptionLabel = (o: ZoomOffice, idx: number): string => {
    if (o.address?.trim()) {
      return `${o.name} · ${o.address} · ${o.city}`;
    }
    return `${o.name} · ${o.city}`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <div>
        <h2 className="text-xl font-semibold text-navy tracking-tight">Información de entrega</h2>
        <p className="text-sm text-slate-500 mt-1">Selecciona cómo quieres recibir tu pedido.</p>
      </div>

      {/* Selector de direcciones guardadas */}
      {session?.user?.id && (
        <div>
          {loadingAddrs ? (
            <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          ) : savedAddresses.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAddrPicker((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <BookUser size={16} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {selectedAddr ? (
                    <>
                      <span className="text-sm font-semibold text-navy">{selectedAddr.alias}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {selectedAddr.firstName} {selectedAddr.lastName} · {selectedAddr.phoneNumber}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500">Usar una dirección guardada</span>
                  )}
                </div>
                <ChevronRight
                  size={15}
                  className={`text-slate-400 flex-shrink-0 transition-transform ${showAddrPicker ? 'rotate-90' : ''}`}
                />
              </button>

              {showAddrPicker && (
                <ul className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {savedAddresses.map((addr) => (
                    <li key={addr.id}>
                      <button
                        type="button"
                        onClick={() => applyAddress(addr)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy">
                            {addr.alias}
                            {addr.isDefault && (
                              <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                Principal
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {addr.firstName} {addr.lastName} · {addr.phoneNumber}
                            {addr.shippingMethod === 'mrw' && addr.mrwOffice
                              ? ` · ${addr.mrwOffice}, ${addr.mrwState}`
                              : addr.shippingMethod === 'zoom' && addr.mrwOffice
                                ? ` · ${addr.mrwOffice}, ${addr.mrwState}`
                                : ' · Retiro en tienda'}
                          </p>
                        </div>
                        {selectedAddrId === addr.id && (
                          <Check size={15} className="text-navy flex-shrink-0" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Método */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          { id: 'tienda' as const, icon: Store,     label: 'Retirar en tienda', sub: 'Recoge tu pedido en nuestra tienda física' },
          { id: 'mrw' as const,    icon: Building2, label: 'Envío nacional',        sub: 'Retira en la oficina de MRW más cercana'      },
          { id: 'zoom' as const,   icon: Building2, label: 'Envío ZOOM',        sub: 'Retira en la oficina de ZOOM más cercana'      },
        ]).map((opt) => {
          const active = shippingMethod === opt.id;
          return (
            <label
              key={opt.id}
              className={`cursor-pointer rounded-2xl p-4 flex items-start gap-3 transition-all ${
                active
                  ? 'border-2 border-navy bg-slate-50 shadow-soft'
                  : 'border border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                value={opt.id}
                {...register('shippingMethod')}
                className="sr-only"
                onChange={() => {
                  setValue('shippingMethod', opt.id);
                  setValue('mrwState', '');
                  setValue('mrwOffice', '');
                  setValue('zoomState', '');
                  setValue('zoomOfficeIndex', '');
                }}
              />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <opt.icon size={17} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy">{opt.label}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">{opt.sub}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Datos personales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field id="firstName" label="Nombre" error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" {...register('firstName', { required: 'Requerido' })} invalid={!!errors.firstName} />
        </Field>
        <Field id="lastName" label="Apellido" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" {...register('lastName', { required: 'Requerido' })} invalid={!!errors.lastName} />
        </Field>
        <Field id="idNumber" label="Cédula de identidad" error={errors.idNumber?.message}>
          <Input
            id="idNumber"
            placeholder="V-12345678"
            autoComplete="off"
            {...register('idNumber', { required: 'Requerido' })}
            invalid={!!errors.idNumber}
          />
        </Field>
        <Field id="phoneNumber" label="Número de celular" error={errors.phoneNumber?.message}>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+58 412-0000000"
            {...register('phoneNumber', { required: 'Requerido' })}
            invalid={!!errors.phoneNumber}
          />
        </Field>
        <Field
          id="email"
          label="Correo electrónico"
          error={errors.email?.message}
          className="sm:col-span-2"
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            {...register('email', {
              required: 'Requerido para enviarte la confirmación del pedido',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Correo no válido',
              },
            })}
            invalid={!!errors.email}
          />
        </Field>
      </div>

      {/* Solo para MRW: estado y oficina */}
      {shippingMethod === 'mrw' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field id="mrwState" label="Estado" error={errors.mrwState?.message}>
            <select
              id="mrwState"
              {...register('mrwState', { required: 'Selecciona un estado' })}
              className={inputCls}
            >
              <option value="">Selecciona…</option>
              {Object.keys(mrwOffices).sort().map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field id="mrwOffice" label="Oficina MRW" error={errors.mrwOffice?.message}>
            <select
              id="mrwOffice"
              disabled={!selectedMrwState}
              {...register('mrwOffice', { required: 'Selecciona una oficina' })}
              className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Selecciona…</option>
              {selectedMrwState &&
                (mrwOffices as Record<string, string[]>)[selectedMrwState]?.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
            </select>
          </Field>
        </div>
      )}

      {/* Solo para ZOOM: estado y oficina */}
      {shippingMethod === 'zoom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field id="zoomState" label="Estado" error={errors.zoomState?.message}>
            <select
              id="zoomState"
              {...register('zoomState', { required: 'Selecciona un estado' })}
              className={inputCls}
            >
              <option value="">Selecciona…</option>
              {Object.keys(zoomOffices).sort().map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field id="zoomOfficeIndex" label="Oficina ZOOM" error={errors.zoomOfficeIndex?.message}>
            <select
              id="zoomOfficeIndex"
              disabled={!selectedZoomState}
              {...register('zoomOfficeIndex', { required: 'Selecciona una oficina' })}
              className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Selecciona…</option>
              {zoomOfficesForState.map((o, idx) => (
                <option key={idx} value={String(idx)}>{zoomOptionLabel(o, idx)}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <div
        className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:pt-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 bg-brand-yellow text-navy font-bold text-sm min-h-[52px] rounded-2xl hover:bg-[#FFE03A] active:scale-[0.98] shadow-soft hover:shadow-card transition-all"
        >
          Continuar al pago <ChevronRight size={16} />
        </button>
      </div>
    </form>
  );
};

export default ShippingForm;
