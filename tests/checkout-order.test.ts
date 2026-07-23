import { describe, expect, it } from 'vitest';
import { checkoutSchema, orderItemSchema, shouldRestoreStockOnCancel } from '@/lib/checkout-order';
import { resolveShippingChargeType } from '@/lib/shipping-charge';

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

describe('checkout-order (freeShipping)', () => {
  it('orderItemSchema ignora freeShipping enviado por el cliente', () => {
    const r = orderItemSchema.safeParse({
      productId: 'prod_1',
      quantity: 1,
      freeShipping: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect('freeShipping' in r.data).toBe(false);
    }
  });

  it('checkoutSchema no acepta freeShipping autoritativo del cliente en items', () => {
    const r = checkoutSchema.safeParse({
      customerName: 'Ana',
      shippingMethod: 'mrw',
      shippingDetails: { address: 'Calle', city: 'Barquisimeto', state: 'Lara' },
      paymentMethodId: 'binancepay',
      freeShipping: true,
      items: [{ productId: 'prod_1', quantity: 1, freeShipping: true }],
      channel: 'web',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect('freeShipping' in r.data).toBe(false);
      expect(r.data.items[0]).not.toHaveProperty('freeShipping');
      // El servidor recalcula con BD + resolveShippingChargeType; sin flags de BD
      // un carrito manipulado no puede forzar FREE desde el payload.
      expect(resolveShippingChargeType(r.data.shippingMethod, [])).toBe('DESTINATION_CHARGE');
    }
  });
});
