import { describe, expect, it } from 'vitest';
import { financialSettingsApiSchema, pickFinancialSettingsDto } from '@/lib/settings-api-schemas';
import { storeSettingsSchema, DEFAULT_SETTINGS } from '@/lib/data-store';
import {
  DEFAULT_PAYMENT_METHODS,
  mergePaymentMethodsWithDefaults,
  paymentMethodsArraySchema,
} from '@/lib/payment-methods';

describe('payment-method-settings', () => {
  it('settings antiguos sin paymentMethods obtienen defaults', () => {
    const merged = mergePaymentMethodsWithDefaults(undefined);
    expect(merged.length).toBe(DEFAULT_PAYMENT_METHODS.length);
    const parsed = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      paymentMethods: undefined,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.paymentMethods.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('pickFinancialSettingsDto incluye paymentMethods', () => {
    const dto = pickFinancialSettingsDto({
      ...DEFAULT_SETTINGS,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
    });
    expect(dto.paymentMethods.length).toBeGreaterThan(0);
    expect(dto.binancePayId).toBeDefined();
  });

  it('financialSettingsApiSchema valida paymentMethods', () => {
    const ok = financialSettingsApiSchema.safeParse({
      pagoMovil: DEFAULT_SETTINGS.pagoMovil,
      transferencia: DEFAULT_SETTINGS.transferencia,
      binancePayId: '',
      binanceQrUrl: '',
      paymentMethods: DEFAULT_PAYMENT_METHODS,
    });
    expect(ok.success).toBe(true);
  });

  it('Zelle activo sin destinatario se rechaza', () => {
    const list = DEFAULT_PAYMENT_METHODS.map((m) =>
      m.id === 'zelle' ? { ...m, active: true, recipientValue: '' } : m,
    );
    expect(paymentMethodsArraySchema.safeParse(list).success).toBe(false);
  });

  it('descuento activo con porcentaje 0 se rechaza si método activo', () => {
    const list = DEFAULT_PAYMENT_METHODS.map((m) =>
      m.id === 'binancepay'
        ? { ...m, active: true, discountEnabled: true, discountPercent: 0 }
        : m,
    );
    expect(paymentMethodsArraySchema.safeParse(list).success).toBe(false);
  });
});
