'use client';

import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { Store, Building2, ChevronRight } from 'lucide-react';
import { mrwOffices } from '@/lib/mrw-offices';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

export type ShippingFormData = {
  firstName:   string;
  lastName:    string;
  email:       string;
  idNumber:    string;
  phoneNumber: string;
  shippingMethod: 'tienda' | 'mrw';
  mrwState?:  string;
  mrwOffice?: string;
};

interface ShippingFormProps {
  onFormSubmit: (data: ShippingFormData) => void;
}

const ShippingForm = ({ onFormSubmit }: ShippingFormProps) => {
  const { data: session } = useSession();
  const {
    register, handleSubmit, formState: { errors }, watch, setValue,
  } = useForm<ShippingFormData>({
    defaultValues: { shippingMethod: 'tienda', email: '' },
  });

  useEffect(() => {
    const e = session?.user?.email?.trim();
    if (e) setValue('email', e);
  }, [session?.user?.email, setValue]);

  const shippingMethod = watch('shippingMethod');
  const selectedState  = watch('mrwState');

  const onSubmit: SubmitHandler<ShippingFormData> = (data) => onFormSubmit(data);

  const inputCls = "block w-full min-h-[48px] px-3.5 text-base bg-slate-50/70 border border-slate-200 rounded-xl text-navy focus:outline-none focus:bg-white focus:border-navy focus:shadow-ring-navy";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <div>
        <h2 className="text-xl font-semibold text-navy tracking-tight">Información de entrega</h2>
        <p className="text-sm text-slate-500 mt-1">Selecciona cómo quieres recibir tu pedido.</p>
      </div>

      {/* Método */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          { id: 'tienda', icon: Store,     label: 'Retirar en tienda', sub: 'Recoge tu pedido en nuestra tienda' },
          { id: 'mrw',    icon: Building2, label: 'Retiro MRW',        sub: 'Retira en oficina más cercana'      },
        ] as const).map((opt) => {
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
                onChange={() => setValue('shippingMethod', opt.id)}
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

      {/* Datos personales — comunes a ambos métodos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field id="firstName" label="Nombre" error={errors.firstName?.message}>
          <Input id="firstName" {...register('firstName', { required: 'Requerido' })} invalid={!!errors.firstName} />
        </Field>
        <Field id="lastName" label="Apellido" error={errors.lastName?.message}>
          <Input id="lastName" {...register('lastName', { required: 'Requerido' })} invalid={!!errors.lastName} />
        </Field>
        <Field id="idNumber" label="Cédula de identidad" error={errors.idNumber?.message}>
          <Input
            id="idNumber"
            placeholder="V-12345678"
            {...register('idNumber', { required: 'Requerido' })}
            invalid={!!errors.idNumber}
          />
        </Field>
        <Field id="phoneNumber" label="Número de celular" error={errors.phoneNumber?.message}>
          <Input
            id="phoneNumber"
            type="tel"
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
            placeholder="tu@correo.com"
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
              disabled={!selectedState}
              {...register('mrwOffice', { required: 'Selecciona una oficina' })}
              className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Selecciona…</option>
              {selectedState &&
                (mrwOffices as Record<string, string[]>)[selectedState]?.map((o) => (
                  <option key={o} value={o}>{o}</option>
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
