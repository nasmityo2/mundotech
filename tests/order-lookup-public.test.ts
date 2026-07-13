import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toPublicOrderLookupDto } from '@/lib/definitions';

const {
  mockOrderFindUnique,
  mockRateLimitCritical,
  mockGetActionClientIp,
  mockLogError,
  rateLimitKeyRef,
} = vi.hoisted(() => ({
  mockOrderFindUnique: vi.fn(),
  mockRateLimitCritical: vi.fn(),
  mockGetActionClientIp: vi.fn(),
  mockLogError: vi.fn(),
  rateLimitKeyRef: { value: '' },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: mockOrderFindUnique },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimitCritical: (key: string, config: unknown) => {
    rateLimitKeyRef.value = key;
    return mockRateLimitCritical(key, config);
  },
  hashForBucket: () => 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
}));

vi.mock('@/lib/security', () => ({
  getActionClientIp: mockGetActionClientIp,
}));

vi.mock('@/lib/safe-logger', () => ({
  logError: mockLogError,
}));

function dec(n: number) {
  return { toNumber: () => n };
}

function mockOrderRow() {
  return {
    id: 'order-internal',
    orderNumber: 42,
    createdAt: new Date('2026-07-11T20:00:00.000Z'),
    customerId: null,
    customerName: 'Cliente Público',
    customerEmail: 'cliente@test.com',
    customerPhone: '0412-1234567',
    customerIdNumber: 'V-12345678',
    total: dec(150),
    exchangeRateUsdBs: dec(60),
    status: 'Pendiente',
    paymentMethod: 'Pago Móvil',
    paymentBank: 'Banesco',
    paymentHolderIdNumber: 'V-87654321',
    paymentHolderPhone: '0414-9999999',
    paymentReference: 'REF-SECRET-123',
    paymentProofUrl: 'https://cdn.test/proof.webp',
    paymentProofKey: 'proofs/secret.webp',
    shippingAddress: 'Calle 1',
    shippingCity: 'Barquisimeto',
    shippingState: 'Lara',
    shippingZipCode: '3001',
    shippingCountry: 'Venezuela',
    channel: 'web',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Teclado',
        quantity: 1,
        price: dec(150),
        imageUrl: '/img.jpg',
        product: { slug: 'teclado-rgb' },
      },
    ],
  };
}

describe('toPublicOrderLookupDto', () => {
  it('no incluye proof, reference ni paymentHolder', () => {
    const dto = toPublicOrderLookupDto({
      orderNumber: 42,
      createdAt: '2026-07-11T20:00:00.000Z',
      customerName: 'Cliente',
      total: 150,
      status: 'Pendiente',
      shippingDetails: {
        address: 'Calle 1',
        city: 'Barquisimeto',
        state: 'Lara',
        zipCode: '3001',
        country: 'Venezuela',
      },
      paymentMethod: 'Pago Móvil',
      items: [
        {
          productId: 'prod-1',
          productName: 'Teclado',
          quantity: 1,
          price: 150,
          productSlug: 'teclado-rgb',
        },
      ],
    });

    expect(dto).not.toHaveProperty('paymentProofUrl');
    expect(dto).not.toHaveProperty('paymentProofKey');
    expect(dto).not.toHaveProperty('paymentReference');
    expect(dto).not.toHaveProperty('paymentHolderIdNumber');
    expect(dto).not.toHaveProperty('paymentHolderPhone');
    expect(dto).not.toHaveProperty('customerEmail');
    expect(dto).not.toHaveProperty('customerIdNumber');
    expect(dto).not.toHaveProperty('id');
  });
});

describe('lookupPublicOrderAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitKeyRef.value = '';
    mockGetActionClientIp.mockResolvedValue('198.51.100.44');
    mockRateLimitCritical.mockResolvedValue({ limited: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function loadAction() {
    const mod = await import('@/app/actions/orderLookupActions');
    return mod.lookupPublicOrderAction;
  }

  it('usa rate limit critical con IP hasheada, no raw', async () => {
    mockOrderFindUnique.mockResolvedValue(null);
    const lookupPublicOrderAction = await loadAction();
    await lookupPublicOrderAction('42', '12345678');

    expect(rateLimitKeyRef.value).toBe('order-lookup:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6');
    expect(rateLimitKeyRef.value).not.toContain('198.51.100.44');
  });

  it('devuelve DTO público sin campos sensibles de pago', async () => {
    mockOrderFindUnique.mockResolvedValue(mockOrderRow());
    const lookupPublicOrderAction = await loadAction();
    const result = await lookupPublicOrderAction('42', '12345678');

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.order).not.toHaveProperty('paymentProofUrl');
    expect(result.order).not.toHaveProperty('paymentProofKey');
    expect(result.order).not.toHaveProperty('paymentReference');
    expect(result.order).not.toHaveProperty('paymentHolderIdNumber');
    expect(result.order).not.toHaveProperty('paymentHolderPhone');
    expect(result.order).not.toHaveProperty('customerEmail');
    expect(result.order).not.toHaveProperty('customerIdNumber');
    expect(result.order).not.toHaveProperty('id');
    expect(result.order.orderNumber).toBe(42);
    expect(result.order.items[0]?.productSlug).toBe('teclado-rgb');
  });

  it('mensaje genérico cuando no hay coincidencia', async () => {
    mockOrderFindUnique.mockResolvedValue(null);
    const lookupPublicOrderAction = await loadAction();
    const result = await lookupPublicOrderAction('9999', '12345678');

    expect(result).toEqual({
      success: false,
      message:
        'No encontramos un pedido con esos datos. Verifica el número de pedido y la cédula tal como los usaste al comprar.',
    });
  });

  it('rechaza entradas demasiado largas sin consultar BD', async () => {
    const lookupPublicOrderAction = await loadAction();
    await lookupPublicOrderAction('1234567890123', '12345678');

    expect(mockOrderFindUnique).not.toHaveBeenCalled();
  });

  it('usa logError seguro en fallos, no console.error', async () => {
    mockOrderFindUnique.mockRejectedValue(new Error('db down'));
    const lookupPublicOrderAction = await loadAction();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await lookupPublicOrderAction('42', '12345678');

    expect(result.success).toBe(false);
    expect(mockLogError).toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
