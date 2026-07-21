'use client';

import type { PaymentMethodConfig } from '@/lib/payment-methods';
import {
  createCustomForeignCurrencyMethod,
  isBuiltinPaymentMethodId,
  isDeletablePaymentMethod,
} from '@/lib/payment-methods';

type Props = {
  methods: PaymentMethodConfig[];
  onChange: (methods: PaymentMethodConfig[]) => void;
  fieldError: (path: string) => string | undefined;
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-h-[48px] px-3 border rounded-lg text-sm ${
          error ? 'border-rose-400' : 'border-gray-200'
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm text-navy ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300"
      />
      {label}
    </label>
  );
}

export function PaymentMethodsAdminSection({ methods, onChange, fieldError }: Props) {
  const updateAt = (index: number, patch: Partial<PaymentMethodConfig>) => {
    const next = methods.map((m, i) => {
      if (i !== index) return m;
      const merged = { ...m, ...patch };
      if (!merged.discountEligible) {
        merged.discountEnabled = false;
        merged.discountPercent = 0;
      }
      return merged;
    });
    onChange(next);
  };

  const removeAt = (index: number) => {
    const m = methods[index];
    if (!m || !isDeletablePaymentMethod(m)) return;
    onChange(methods.filter((_, i) => i !== index));
  };

  const addCustom = () => {
    onChange([...methods, createCustomForeignCurrencyMethod(methods)]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-navy">Descuentos por método de pago</h3>
          <p className="text-xs text-slate-500 mt-1">
            Configura qué métodos en divisas ofrecen descuento. El porcentaje se congela al crear cada pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded-xl bg-navy text-white text-xs font-semibold px-3 py-2 hover:bg-navy-700"
        >
          Agregar método en divisas
        </button>
      </div>

      {fieldError('paymentMethods') && (
        <p className="text-xs text-rose-600">{fieldError('paymentMethods')}</p>
      )}

      <div className="space-y-4">
        {methods.map((method, index) => {
          const builtin = isBuiltinPaymentMethodId(method.id);
          const canDiscount = method.discountEligible;
          return (
            <div
              key={method.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-navy">{method.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {method.id} · {method.kind}
                  </p>
                </div>
                {isDeletablePaymentMethod(method) && (
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Nombre"
                  value={method.name}
                  onChange={(v) => updateAt(index, { name: v })}
                  error={fieldError(`paymentMethods.${index}.name`)}
                />
                <Field
                  label="Descripción"
                  value={method.description}
                  onChange={(v) => updateAt(index, { description: v })}
                  error={fieldError(`paymentMethods.${index}.description`)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Toggle label="Activo" checked={method.active} onChange={(v) => updateAt(index, { active: v })} />
                <Toggle label="Disponible en WhatsApp" checked={method.enabledInWhatsapp} onChange={(v) => updateAt(index, { enabledInWhatsapp: v })} />
                <Toggle label="Disponible en Full" checked={method.enabledInFull} onChange={(v) => updateAt(index, { enabledInFull: v })} />
                <Toggle label="Aplicar descuento" checked={method.discountEnabled} disabled={!canDiscount} onChange={(v) => updateAt(index, { discountEnabled: v })} />
                <Toggle label="Requiere referencia en Full" checked={method.requireReferenceInFull} onChange={(v) => updateAt(index, { requireReferenceInFull: v })} />
                <Toggle label="Requiere comprobante en Full" checked={method.requireProofInFull} onChange={(v) => updateAt(index, { requireProofInFull: v })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Porcentaje de descuento"
                  type="number"
                  value={String(method.discountPercent)}
                  onChange={(v) => {
                    const n = Number(v);
                    updateAt(index, { discountPercent: Number.isFinite(n) ? n : 0 });
                  }}
                  error={fieldError(`paymentMethods.${index}.discountPercent`)}
                />
                <Field
                  label="Orden visual"
                  type="number"
                  value={String(method.sortOrder)}
                  onChange={(v) => {
                    const n = Number.parseInt(v, 10);
                    updateAt(index, { sortOrder: Number.isFinite(n) ? n : method.sortOrder });
                  }}
                />
              </div>

              <Field
                label="Instrucciones"
                value={method.instructions}
                onChange={(v) => updateAt(index, { instructions: v })}
                error={fieldError(`paymentMethods.${index}.instructions`)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Etiqueta del destinatario"
                  value={method.recipientLabel}
                  onChange={(v) => updateAt(index, { recipientLabel: v })}
                />
                <Field
                  label="Dato del destinatario"
                  value={method.recipientValue}
                  onChange={(v) => updateAt(index, { recipientValue: v })}
                  error={fieldError(`paymentMethods.${index}.recipientValue`)}
                />
              </div>

              <Field
                label="Monedas aceptadas (separadas por coma)"
                value={method.acceptedCurrencies.join(', ')}
                onChange={(v) =>
                  updateAt(index, {
                    acceptedCurrencies: v
                      .split(',')
                      .map((c) => c.trim().toUpperCase())
                      .filter(Boolean)
                      .slice(0, 10),
                  })
                }
                error={fieldError(`paymentMethods.${index}.acceptedCurrencies`)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alcance de entrega Full
                </label>
                <select
                  className="w-full min-h-[48px] px-3 border border-gray-200 rounded-lg text-sm bg-white"
                  value={method.fullDeliveryScope}
                  onChange={(e) =>
                    updateAt(index, {
                      fullDeliveryScope: e.target.value as PaymentMethodConfig['fullDeliveryScope'],
                    })
                  }
                >
                  <option value="ANY">Cualquier modalidad</option>
                  <option value="STORE_PICKUP_ONLY">Solo retiro en tienda</option>
                </select>
                {method.fullDeliveryScope === 'STORE_PICKUP_ONLY' && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    En modo Full este método solo aparecerá para retiro en tienda.
                  </p>
                )}
              </div>

              {builtin && (
                <p className="text-[11px] text-slate-400">
                  Método built-in: el ID y el tipo no se pueden editar
                  {method.kind === 'PAGO_MOVIL' ||
                  method.kind === 'BANK_TRANSFER' ||
                  method.kind === 'BINANCE' ||
                  method.kind === 'CASHEA'
                    ? ' ni eliminar.'
                    : '.'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
