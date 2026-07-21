import { describe, expect, it } from 'vitest';
import { checkoutSchema, shouldRestoreStockOnCancel } from '@/lib/checkout-order';

describe('checkout-order (payment methods)', () => {
  it('acepta paymentMethodId válido', () => {
    const r = checkoutSchema.safeParse({
      customerName: 'Ana',
      shippingDetails: { address: 'Calle', city: 'Barquisimeto', state: 'Lara' },
      paymentMethodId: 'binancepay',
      items: [{ productId: 'prod_1', quantity: 2 }],
      channel: 'whatsapp',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza paymentMethodId con caracteres inválidos', () => {
    const r = checkoutSchema.safeParse({
      customerName: 'Ana',
      shippingDetails: { address: 'Calle', city: 'Barquisimeto', state: 'Lara' },
      paymentMethodId: 'Binance Pay',
      items: [{ productId: 'prod_1', quantity: 1 }],
    });
    expect(r.success).toBe(false);
  });

  it('shouldRestoreStockOnCancel unchanged for Binance pending', () => {
    expect(shouldRestoreStockOnCancel('Pendiente verificación Binance', 'Cancelado')).toBe(true);
  });
});
