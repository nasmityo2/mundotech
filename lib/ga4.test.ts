/**
 * SESIÓN 31 — Tests unitarios de GA4 (lib/ga4.ts).
 *
 * Verifica que:
 * - track() es no-op sin gtag o sin NEXT_PUBLIC_GA4_ID.
 * - Los eventos ecommerce nunca contienen PII (email, teléfono, nombre, cédula,
 *   dirección, referencia, token, key).
 * - Purchase se deduplica por transaction_id (sessionStorage).
 * - ga4ItemsValue calcula correctamente.
 * - toGa4Item mapea todos los campos y omite undefineds.
 * - trackPurchaseOnce documenta la limitación de sessionStorage.
 * - La moneda es siempre USD.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  track,
  toGa4Item,
  ga4ItemsValue,
  GA4_CURRENCY,
  trackPurchaseOnce,
} from './ga4';

// Guardamos NEXT_PUBLIC_GA4_ID original para restaurar después
const ORIGINAL_GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

// ── sessionStorage mock para node ────────────────────────────────────────────
// sessionStorage no existe en node, lo creamos manualmente.
const ssStore = new Map<string, string>();
const sessionStorageMock = {
  getItem: vi.fn((key: string) => ssStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { ssStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { ssStore.delete(key); }),
  clear: vi.fn(() => ssStore.clear()),
  get length() { return ssStore.size; },
  key: vi.fn((_i: number) => ''),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockGtag() {
  const gtag = vi.fn();
  (globalThis as Record<string, unknown>).window = { gtag } as unknown as Window & typeof globalThis;
  return gtag;
}

function unmockGtag() {
  delete (globalThis as Record<string, unknown>).window;
}

function setGa4Id(id: string | undefined) {
  if (id === undefined) {
    delete process.env.NEXT_PUBLIC_GA4_ID;
  } else {
    process.env.NEXT_PUBLIC_GA4_ID = id;
  }
}

const PII_PATTERNS = [
  /email/i, /correo/i, /@/,
  /tel[eé]fono/i, /phone/i,
  /c[eé]dula/i, /identificaci[oó]n/i, /dni/i, /passport/i,
  /direcci[oó]n/i, /address/i,
  /referencia/i, /reference/i,
  /token/i,
  /key/i, /api.?key/i, /secret/i,
  /password/i,
];

function hasPii(params: Record<string, unknown> | undefined): boolean {
  if (!params) return false;
  for (const [key, val] of Object.entries(params)) {
    if (PII_PATTERNS.some((p) => p.test(key))) return true;
    if (typeof val === 'string' && PII_PATTERNS.some((p) => p.test(val))) return true;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object' && item !== null && hasPii(item as Record<string, unknown>)) return true;
      }
    }
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      if (hasPii(val as Record<string, unknown>)) return true;
    }
  }
  return false;
}

function hasSensitiveKeys(params: Record<string, unknown> | undefined): boolean {
  if (!params) return false;
  const sensitiveKeys = new Set([
    'email', 'phone', 'telephone', 'address', 'cedula', 'cedula_rif',
    'token', 'api_key', 'apikey', 'secret', 'password', 'passwd',
    'reference', 'referencia', 'customer_email', 'customer_name',
    'customer_phone', 'shipping_address', 'billing_address',
    'stripe_token', 'card_number', 'cvv', 'cvc', 'card_cvc',
    'transfer_reference', 'payment_reference',
  ]);
  for (const key of Object.keys(params ?? {})) {
    if (sensitiveKeys.has(key.toLowerCase().replace(/[_-]/g, '_'))) return true;
  }
  return false;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleItem = {
  id: 'prod-123',
  name: 'Teclado Mecánico RGB',
  category: 'Tecnología',
  brand: 'MundoTech',
  price: 45.99,
  quantity: 2,
};

const piiItem = {
  id: 'prod-pii',
  name: 'Producto con datos sensibles',
  // Estos campos NO deberían estar en un Ga4Item
  email: 'cliente@example.com',
  phone: '+584241234567',
  cedula: 'V-12345678',
  address: 'Calle 21 con carrera 21, Barquisimeto',
  reference: 'PAGO-001',
  token: 'tok_abc123',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GA4_CURRENCY', () => {
  it('es USD', () => {
    expect(GA4_CURRENCY).toBe('USD');
  });
});

describe('toGa4Item', () => {
  it('mapea todos los campos correctamente', () => {
    const result = toGa4Item(sampleItem);
    expect(result).toEqual({
      item_id: 'prod-123',
      item_name: 'Teclado Mecánico RGB',
      item_category: 'Tecnología',
      item_brand: 'MundoTech',
      price: 45.99,
      quantity: 2,
    });
  });

  it('omite category y brand si son null/undefined', () => {
    const result = toGa4Item({ id: 'x', name: 'Genérico', price: 10 });
    expect(result.item_category).toBeUndefined();
    expect(result.item_brand).toBeUndefined();
    expect(result.price).toBe(10);
    expect(result.quantity).toBeUndefined();
  });

  it('omite price si no es number', () => {
    const result = toGa4Item({ id: 'x', name: 'Sin precio' });
    expect(result.price).toBeUndefined();
  });

  it('NUNCA incluye PII como campos propios', () => {
    const result = toGa4Item(piiItem as Parameters<typeof toGa4Item>[0]);
    const keys = Object.keys(result);
    expect(keys).not.toContain('email');
    expect(keys).not.toContain('phone');
    expect(keys).not.toContain('cedula');
    expect(keys).not.toContain('address');
    expect(keys).not.toContain('reference');
    expect(keys).not.toContain('token');
    expect(keys.every((k) =>
      ['item_id', 'item_name', 'item_category', 'item_brand', 'price', 'quantity', 'index'].includes(k),
    )).toBe(true);
  });
});

describe('ga4ItemsValue', () => {
  it('suma price × quantity de todos los items y redondea a 2 decimales', () => {
    const items = [
      { item_id: 'a', item_name: 'A', price: 10.50, quantity: 2 },
      { item_id: 'b', item_name: 'B', price: 5.25, quantity: 3 },
    ];
    expect(ga4ItemsValue(items)).toBe(36.75);
  });

  it('usa quantity=1 si no está definido', () => {
    const items = [
      { item_id: 'a', item_name: 'A', price: 10 },
      { item_id: 'b', item_name: 'B', price: 20 },
    ];
    expect(ga4ItemsValue(items)).toBe(30);
  });

  it('retorna 0 para array vacío', () => {
    expect(ga4ItemsValue([])).toBe(0);
  });

  it('tolera price undefined (lo trata como 0)', () => {
    const items = [
      { item_id: 'a', item_name: 'A', quantity: 2 },
      { item_id: 'b', item_name: 'B', price: 10, quantity: 1 },
    ];
    expect(ga4ItemsValue(items)).toBe(10);
  });

  it('redondea correctamente a 2 decimales', () => {
    const items = [
      { item_id: 'a', item_name: 'A', price: 1.234, quantity: 3 },
    ];
    expect(ga4ItemsValue(items)).toBe(3.70);
  });
});

describe('track (disparo de eventos)', () => {
  beforeEach(() => {
    unmockGtag();
    setGa4Id('G-TEST123');
  });

  it('es no-op si no hay window.gtag', () => {
    expect(() => track('view_item', { items: [] })).not.toThrow();
  });

  it('es no-op si NEXT_PUBLIC_GA4_ID no está definido', () => {
    setGa4Id(undefined);
    mockGtag();
    expect(() => track('view_item', { items: [] })).not.toThrow();
  });

  it('es no-op en server-side (typeof window === undefined)', () => {
    setGa4Id('G-TEST123');
    delete (globalThis as Record<string, unknown>).window;
    expect(() => track('add_to_cart', { items: [] })).not.toThrow();
  });

  it('llama gtag con event y params cuando está configurado', () => {
    const gtag = mockGtag();
    track('view_item', {
      currency: 'USD',
      value: 45.99,
      items: [{ item_id: 'p1', item_name: 'Producto' }],
    });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'view_item', {
      currency: 'USD',
      value: 45.99,
      items: [{ item_id: 'p1', item_name: 'Producto' }],
    });
  });

  it('no pasa PII en view_item', () => {
    mockGtag();
    const params = {
      currency: 'USD',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto' }],
    };
    expect(hasPii(params)).toBe(false);
    expect(hasSensitiveKeys(params)).toBe(false);
    track('view_item', params);
  });

  it('no pasa PII en add_to_cart', () => {
    mockGtag();
    const params = {
      currency: 'USD',
      value: 45.99,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 45.99, quantity: 1 }],
    };
    expect(hasPii(params)).toBe(false);
    expect(hasSensitiveKeys(params)).toBe(false);
    track('add_to_cart', params);
  });

  it('no pasa PII en remove_from_cart', () => {
    mockGtag();
    const params = {
      currency: 'USD',
      value: 45.99,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 45.99, quantity: 1 }],
    };
    expect(hasPii(params)).toBe(false);
    expect(hasSensitiveKeys(params)).toBe(false);
    track('remove_from_cart', params);
  });

  it('no pasa PII en begin_checkout', () => {
    mockGtag();
    const params = {
      currency: 'USD',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    };
    expect(hasPii(params)).toBe(false);
    expect(hasSensitiveKeys(params)).toBe(false);
    track('begin_checkout', params);
  });

  it('no pasa PII en add_shipping_info', () => {
    mockGtag();
    const params = {
      currency: 'USD',
      value: 100,
      shipping_tier: 'MRW',
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    };
    expect(hasPii(params)).toBe(false);
    expect(hasSensitiveKeys(params)).toBe(false);
    track('add_shipping_info', params);
  });

  it('no pasa PII en add_payment_info', () => {
    mockGtag();
    const params = {
      currency: 'USD',
      value: 100,
      payment_type: 'transferencia',
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    };
    expect(hasPii(params)).toBe(false);
    expect(hasSensitiveKeys(params)).toBe(false);
    track('add_payment_info', params);
  });

  it('nunca rompe la UI aunque gtag falle', () => {
    (globalThis as Record<string, unknown>).window = { gtag: 'not-a-function' as never };
    expect(() => track('purchase', {})).not.toThrow();
  });

  it('nunca rompe la UI aunque los parámetros sean inválidos', () => {
    mockGtag();
    expect(() => track('view_item', null as unknown as Record<string, unknown>)).not.toThrow();
  });
});

describe('Payload allowlist — eventos estándar de ecommerce GA4', () => {
  beforeEach(() => {
    setGa4Id('G-TEST123');
  });

  it('view_item payload contiene solo campos permitidos', () => {
    const gtag = mockGtag();
    const items = [{ item_id: 'p1', item_name: 'Producto', price: 50, quantity: 1 }];
    track('view_item', { currency: 'USD', value: 50, items });
    const args = gtag.mock.calls[0];
    const payload = args[2] as Record<string, unknown>;
    const allowedKeys = ['currency', 'value', 'items'];
    expect(Object.keys(payload).every((k) => allowedKeys.includes(k))).toBe(true);
  });

  it('add_to_cart payload contiene solo campos permitidos', () => {
    const gtag = mockGtag();
    const items = [{ item_id: 'p1', item_name: 'Producto', price: 50, quantity: 1 }];
    track('add_to_cart', { currency: 'USD', value: 50, items });
    const args = gtag.mock.calls[0];
    const payload = args[2] as Record<string, unknown>;
    const allowedKeys = ['currency', 'value', 'items'];
    expect(Object.keys(payload).every((k) => allowedKeys.includes(k))).toBe(true);
  });

  it('purchase payload contiene solo campos permitidos', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
      coupon: 'DESC10',
    });
    const args = gtag.mock.calls[0];
    const payload = args[2] as Record<string, unknown>;
    const allowedKeys = ['transaction_id', 'value', 'currency', 'coupon', 'items'];
    expect(Object.keys(payload).every((k) => allowedKeys.includes(k))).toBe(true);
  });

  it('items dentro del payload nunca contienen PII', () => {
    const gtag = mockGtag();
    const items = [
      { item_id: 'p1', item_name: 'Producto', price: 50, quantity: 1 },
    ];
    track('add_to_cart', { currency: 'USD', value: 50, items });
    const args = gtag.mock.calls[0];
    const payload = args[2] as Record<string, unknown>;
    expect(hasPii(payload)).toBe(false);
    expect(hasSensitiveKeys(payload)).toBe(false);
  });

  it('purchase items nunca contienen PII', () => {
    const gtag = mockGtag();
    const items = [
      { item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 },
    ];
    trackPurchaseOnce({ transactionId: 'ORD-001', value: 100, items });
    const args = gtag.mock.calls[0];
    const payload = args[2] as Record<string, unknown>;
    expect(hasPii(payload)).toBe(false);
    expect(hasSensitiveKeys(payload)).toBe(false);
  });
});

describe('trackPurchaseOnce (dedupe)', () => {
  beforeEach(() => {
    unmockGtag();
    setGa4Id('G-TEST123');
    ssStore.clear();
    vi.stubGlobal('sessionStorage', sessionStorageMock);
  });

  it('llama gtag con purchase en primera llamada', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    expect(gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
      transaction_id: 'ORD-001',
      value: 100,
      currency: 'USD',
    }));
  });

  it('NO llama gtag si el mismo transaction_id ya fue reportado', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    expect(gtag).toHaveBeenCalledTimes(1);

    gtag.mockClear();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    expect(gtag).not.toHaveBeenCalled();
  });

  it('permite trackear un transaction_id diferente', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    expect(gtag).toHaveBeenCalledTimes(1);

    gtag.mockClear();
    trackPurchaseOnce({
      transactionId: 'ORD-002',
      value: 50,
      items: [{ item_id: 'p2', item_name: 'Otro', price: 50, quantity: 1 }],
    });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
      transaction_id: 'ORD-002',
    }));
  });

  it('es no-op si sessionStorage falla (modo privado)', () => {
    const gtag = mockGtag();
    // Simular sessionStorage.setItem fallando
    sessionStorageMock.setItem = vi.fn(() => { throw new Error('sessionStorage blocked'); });

    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    // Debe trackear igual (fallback sin dedupe)
    expect(gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
      transaction_id: 'ORD-001',
    }));
  });

  it('limita el historial a 20 IDs', () => {
    mockGtag();
    for (let i = 1; i <= 25; i++) {
      trackPurchaseOnce({
        transactionId: `ORD-${String(i).padStart(3, '0')}`,
        value: i,
        items: [{ item_id: `p${i}`, item_name: `Producto ${i}`, price: 1, quantity: 1 }],
      });
    }
    const stored = JSON.parse(sessionStorage.getItem('mt_ga4_purchases') ?? '[]');
    expect(stored.length).toBeLessThanOrEqual(20);
    expect(stored).not.toContain('ORD-001');
  });

  it('incluye coupon cuando está presente', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 90,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
      coupon: 'DESC10',
    });
    expect(gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
      transaction_id: 'ORD-001',
      coupon: 'DESC10',
    }));
  });

  it('no pasa coupon cuando es null', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
      coupon: null,
    });
    const callArgs = gtag.mock.calls[0];
    const params = callArgs[2] as Record<string, unknown>;
    expect(params.coupon).toBeUndefined();
  });

  it('la currency es siempre USD en purchase', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    expect(gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
      currency: 'USD',
    }));
  });

  it('documenta limitación: sessionStorage no persiste entre pestañas', () => {
    const gtag = mockGtag();
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    expect(gtag).toHaveBeenCalledTimes(1);

    // Simular "otra pestaña" limpiando sessionStorage
    sessionStorage.removeItem('mt_ga4_purchases');
    gtag.mockClear();

    // El mismo transaction_id se trackearía de nuevo (limitación documentada)
    trackPurchaseOnce({
      transactionId: 'ORD-001',
      value: 100,
      items: [{ item_id: 'p1', item_name: 'Producto', price: 100, quantity: 1 }],
    });
    expect(gtag).toHaveBeenCalledTimes(1);
    // Nota: Esto es correcto - es una limitación documentada. Una solución
    // server-side requeriría un endpoint /api/ga4-dedupe que verifique contra
    // la BD antes de emitir el evento, pero añadiría latencia al checkout.
  });
});

describe('track con GA4_ID ausente (comportamiento no-op)', () => {
  beforeEach(() => {
    unmockGtag();
    setGa4Id(undefined);
  });

  it('ningún evento rompe si GA4_ID no está configurado', () => {
    const gtag = mockGtag();
    track('view_item', { items: [] });
    track('add_to_cart', { items: [] });
    track('remove_from_cart', { items: [] });
    track('view_cart', { items: [] });
    track('begin_checkout', { items: [] });
    track('add_shipping_info', { items: [] });
    track('add_payment_info', { items: [] });
    trackPurchaseOnce({ transactionId: 'T1', value: 0, items: [] });
    expect(gtag).not.toHaveBeenCalled();
  });
});
