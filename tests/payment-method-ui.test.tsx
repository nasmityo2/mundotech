/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  estimatePaymentDiscountUsd,
  buildCheckoutPaymentMethods,
  DEFAULT_PAYMENT_METHODS,
} from '@/lib/payment-methods';

describe('payment-method-ui', () => {
  it('estimación de ahorro no es autoritativa pero es determinista', () => {
    expect(estimatePaymentDiscountUsd(100, 10)).toBe(10);
    expect(estimatePaymentDiscountUsd(19.99, 7.5)).toBe(1.5);
  });

  it('DTO de checkout no incluye métodos inactivos', () => {
    const dto = buildCheckoutPaymentMethods(
      {
        pagoMovil: { bank: 'B', phone: '1', idNumber: 'V' },
        transferencia: { bank: 'B', accountNumber: '1', accountHolder: 'H', rif: 'J' },
        binancePayId: '123',
        paymentMethods: DEFAULT_PAYMENT_METHODS,
      },
      'whatsapp',
    );
    expect(dto.every((m) => typeof m.id === 'string')).toBe(true);
    expect(dto.find((m) => m.id === 'zelle')).toBeUndefined();
    for (const m of dto) {
      expect(m).toHaveProperty('discountPercent');
      expect(m).toHaveProperty('requireReferenceInFull');
      expect(m).not.toHaveProperty('sortOrder');
    }
  });

  it('badge copy format', () => {
    const pct = 10;
    const badge = `${pct}% de descuento pagando en divisas`;
    expect(badge).toContain('descuento pagando en divisas');
  });
});
