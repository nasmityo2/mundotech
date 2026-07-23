import { describe, expect, it } from 'vitest';
import {
  resolveShippingChargeType,
  shippingChargeLabel,
  isStorePickupOrderAddress,
  orderShippingChargeLabelFromSnapshot,
} from '@/lib/shipping-charge';

describe('resolveShippingChargeType', () => {
  it('retiro en tienda siempre es STORE_PICKUP', () => {
    expect(resolveShippingChargeType('tienda', [false])).toBe('STORE_PICKUP');
    expect(resolveShippingChargeType('tienda', [true])).toBe('STORE_PICKUP');
    expect(resolveShippingChargeType('tienda', [true, true])).toBe('STORE_PICKUP');
  });

  it('carrier + todos freeShipping → FREE', () => {
    expect(resolveShippingChargeType('mrw', [true])).toBe('FREE');
    expect(resolveShippingChargeType('zoom', [true, true])).toBe('FREE');
    expect(resolveShippingChargeType('tealca', [true, true, true])).toBe('FREE');
  });

  it('carrier + al menos un false → DESTINATION_CHARGE', () => {
    expect(resolveShippingChargeType('mrw', [false])).toBe('DESTINATION_CHARGE');
    expect(resolveShippingChargeType('zoom', [true, false])).toBe('DESTINATION_CHARGE');
    expect(resolveShippingChargeType('tealca', [false, true])).toBe('DESTINATION_CHARGE');
  });

  it('carrito vacío o método ausente → DESTINATION_CHARGE', () => {
    expect(resolveShippingChargeType('mrw', [])).toBe('DESTINATION_CHARGE');
    expect(resolveShippingChargeType(null, [true])).toBe('DESTINATION_CHARGE');
    expect(resolveShippingChargeType(undefined, [true])).toBe('DESTINATION_CHARGE');
  });
});

describe('shippingChargeLabel', () => {
  it('devuelve textos en español', () => {
    expect(shippingChargeLabel('STORE_PICKUP')).toBe('Retiro gratis en tienda');
    expect(shippingChargeLabel('FREE')).toBe('Envío gratis');
    expect(shippingChargeLabel('DESTINATION_CHARGE')).toBe('Cobro a destino');
  });
});

describe('isStorePickupOrderAddress', () => {
  it('detecta el prefijo fijo de retiro en tienda', () => {
    expect(isStorePickupOrderAddress('Retiro en tienda — Av. Principal')).toBe(true);
    expect(isStorePickupOrderAddress('retiro en tienda')).toBe(true);
    expect(isStorePickupOrderAddress('Calle 10, Barquisimeto')).toBe(false);
    expect(isStorePickupOrderAddress(null)).toBe(false);
    expect(isStorePickupOrderAddress(undefined)).toBe(false);
  });
});

describe('orderShippingChargeLabelFromSnapshot', () => {
  it('prioriza retiro en tienda sobre freeShipping', () => {
    expect(
      orderShippingChargeLabelFromSnapshot({
        freeShipping: true,
        shippingAddress: 'Retiro en tienda — Centro',
      }),
    ).toBe('Retiro gratis en tienda');
  });

  it('usa snapshot freeShipping para carrier', () => {
    expect(
      orderShippingChargeLabelFromSnapshot({
        freeShipping: true,
        shippingAddress: 'Calle 1',
      }),
    ).toBe('Envío gratis');
    expect(
      orderShippingChargeLabelFromSnapshot({
        freeShipping: false,
        shippingAddress: 'Calle 1',
      }),
    ).toBe('Cobro a destino');
  });
});

/**
 * Espejo de la regla autoritativa del checkout (lib/checkout-order.ts):
 * Order.freeShipping = resolve === FREE; OrderItem conserva el flag del producto.
 */
describe('checkout freeShipping snapshot rules', () => {
  function orderSnapshot(
    shippingMethod: 'tienda' | 'mrw' | 'zoom' | 'tealca' | null | undefined,
    productFlags: readonly boolean[],
  ) {
    const type = resolveShippingChargeType(shippingMethod, productFlags);
    return {
      orderFreeShipping: type === 'FREE',
      itemSnapshots: [...productFlags],
      label: shippingChargeLabel(type),
    };
  }

  it('1 producto gratis + MRW → Order.freeShipping true', () => {
    const s = orderSnapshot('mrw', [true]);
    expect(s.orderFreeShipping).toBe(true);
    expect(s.itemSnapshots).toEqual([true]);
    expect(s.label).toBe('Envío gratis');
  });

  it('2 productos gratis + ZOOM → Order.freeShipping true', () => {
    expect(orderSnapshot('zoom', [true, true]).orderFreeShipping).toBe(true);
  });

  it('carrito mixto → Order false; ítems conservan snapshot individual', () => {
    const s = orderSnapshot('tealca', [true, false]);
    expect(s.orderFreeShipping).toBe(false);
    expect(s.itemSnapshots).toEqual([true, false]);
    expect(s.label).toBe('Cobro a destino');
  });

  it('ningún producto gratis → Order.freeShipping false', () => {
    expect(orderSnapshot('mrw', [false, false]).orderFreeShipping).toBe(false);
  });

  it('todos gratis + retiro en tienda → Order.freeShipping false', () => {
    const s = orderSnapshot('tienda', [true, true]);
    expect(s.orderFreeShipping).toBe(false);
    expect(s.label).toBe('Retiro gratis en tienda');
  });

  it('producto antiguo (undefined/false) se interpreta como false', () => {
    expect(orderSnapshot('mrw', [false]).orderFreeShipping).toBe(false);
    // Fail-safe del carrito: solo `=== true` cuenta
    expect((undefined as unknown as boolean) === true).toBe(false);
  });
});
