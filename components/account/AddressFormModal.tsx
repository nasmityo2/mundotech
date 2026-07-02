'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Store, Building2, Loader2, X } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { mrwOffices } from '@/lib/mrw-offices';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { SavedAddress, SavedAddressInput } from '@/lib/definitions';

type FormValues = {
  alias:          string;
  firstName:      string;
  lastName:       string;
  idNumber:       string;
  phoneNumber:    string;
  shippingMethod: 'tienda' | 'mrw';
  mrwState:       string;
  mrwOffice:      string;
  isDefault:      boolean;
};

interface AddressFormModalProps {
  editAddress?: SavedAddress | null;
  onClose:  () => void;
  onSubmit: (data: SavedAddressInput) => Promise<void>;
  isSubmitting: boolean;
}

const selectCls =
  'block w-full min-h-[48px] px-3.5 text-base bg-slate-50/70 border border-slate-200 rounded-xl text-navy focus:outline-none focus:bg-white focus:border-navy focus:shadow-ring-navy';

export default function AddressFormModal({
  editAddress,
  onClose,
  onSubmit,
  isSubmitting,
}: AddressFormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        alias:          editAddress?.alias          ?? '',
        firstName:      editAddress?.firstName      ?? '',
        lastName:       editAddress?.lastName       ?? '',
        idNumber:       editAddress?.idNumber       ?? '',
        phoneNumber:    editAddress?.phoneNumber    ?? '',
        shippingMethod: editAddress?.shippingMethod ?? 'tienda',
        mrwState:       editAddress?.mrwState       ?? '',
        mrwOffice:      editAddress?.mrwOffice      ?? '',
        isDefault:      editAddress?.isDefault      ?? false,
      },
    });

  const method       = watch('shippingMethod');
  const selectedState = watch('mrwState');

  useEffect(() => {
    setValue('mrwOffice', '');
  }, [selectedState, setValue]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Bottom sheet móvil: sin esto el body seguía scrolleando detrás del modal.
  useBodyScrollLock(true);

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      alias:          values.alias,
      firstName:      values.firstName,
      lastName:       values.lastName,
      idNumber:       values.idNumber,
      phoneNumber:    values.phoneNumber,
      shippingMethod: values.shippingMethod,
      mrwState:       values.shippingMethod === 'mrw' ? values.mrwState : null,
      mrwOffice:      values.shippingMethod === 'mrw' ? values.mrwOffice : null,
      isDefault:      values.isDefault,
    });
  });

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
    >
      <div role="dialog" aria-modal="true" aria-label="Formulario de dirección" className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-navy">
            {editAddress ? 'Editar dirección' : 'Nueva dirección'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 -my-1.5 -mr-2 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-navy transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          {/* Alias */}
          <Field id="alias" label="Nombre de esta dirección" error={errors.alias?.message}>
            <Input
              id="alias"
              placeholder='Ej: "Casa", "Trabajo", "Oficina MRW Caracas"'
              {...register('alias', { required: 'El alias es requerido.' })}
              invalid={!!errors.alias}
            />
          </Field>

          {/* Método de retiro */}
          <div>
            <p className="text-[12px] font-semibold text-navy tracking-tight mb-2">Método de entrega</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'tienda', icon: Store,     label: 'Retirar en tienda' },
                { id: 'mrw',    icon: Building2, label: 'Retiro MRW'        },
              ] as const).map((opt) => {
                const active = method === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`cursor-pointer rounded-xl p-3 flex items-center gap-2.5 transition-all ${
                      active
                        ? 'border-2 border-navy bg-slate-50'
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
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <opt.icon size={14} />
                    </div>
                    <span className="text-sm font-medium text-navy">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* MRW: estado y oficina */}
          {method === 'mrw' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="mrwState" label="Estado" error={errors.mrwState?.message}>
                <select
                  id="mrwState"
                  {...register('mrwState', { required: method === 'mrw' ? 'Selecciona un estado.' : false })}
                  className={selectCls}
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
                  {...register('mrwOffice', { required: method === 'mrw' ? 'Selecciona una oficina.' : false })}
                  className={`${selectCls} disabled:opacity-50 disabled:cursor-not-allowed`}
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

          {/* Datos personales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="firstName" label="Nombre" error={errors.firstName?.message}>
              <Input
                id="firstName"
                {...register('firstName', { required: 'El nombre es requerido.' })}
                invalid={!!errors.firstName}
              />
            </Field>
            <Field id="lastName" label="Apellido" error={errors.lastName?.message}>
              <Input
                id="lastName"
                {...register('lastName', { required: 'El apellido es requerido.' })}
                invalid={!!errors.lastName}
              />
            </Field>
            <Field id="idNumber" label="Cédula de identidad" error={errors.idNumber?.message}>
              <Input
                id="idNumber"
                placeholder="V-12345678"
                {...register('idNumber', { required: 'La cédula es requerida.' })}
                invalid={!!errors.idNumber}
              />
            </Field>
            <Field id="phoneNumber" label="Celular" error={errors.phoneNumber?.message}>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+58 412-0000000"
                {...register('phoneNumber', { required: 'El teléfono es requerido.' })}
                invalid={!!errors.phoneNumber}
              />
            </Field>
          </div>

          {/* Predeterminada */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register('isDefault')}
              className="w-4 h-4 rounded accent-navy cursor-pointer"
            />
            <span className="text-sm text-slate-700">Usar como dirección predeterminada</span>
          </label>

          {/* CTA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white font-bold text-sm min-h-[52px] rounded-2xl hover:bg-navy-700 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin" /> Guardando…</>
              ) : editAddress ? (
                'Guardar cambios'
              ) : (
                'Agregar dirección'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
