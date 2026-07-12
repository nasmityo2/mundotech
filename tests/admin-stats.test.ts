import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/safe-logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    total: { toNumber: () => 100.0 },
    exchangeRateUsdBs: null,
    status: 'Entregado',
    paymentMethod: 'Pago Móvil',
    paidAt: new Date('2026-07-10T14:00:00Z'),
    createdAt: new Date('2026-07-10T12:00:00Z'),
    ...overrides,
  };
}

function mockItem(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    productId: 'prod-1',
    productName: 'Producto 1',
    quantity: 2,
    price: { toNumber: () => 25.0 },
    ...overrides,
  };
}

// ── Pure logic tests ─────────────────────────────────────────────────────────

describe('computeCutoff', () => {
  it('returns null for range=all', async () => {
    const { computeCutoff } = await import('@/app/api/admin/stats/route');
    expect(computeCutoff('all', 'America/Caracas')).toBeNull();
  });

  it('returns a Date for range=7d', async () => {
    const { computeCutoff } = await import('@/app/api/admin/stats/route');
    const result = computeCutoff('7d', 'America/Caracas');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBeLessThan(Date.now());
  });

  it('returns a Date for range=30d', async () => {
    const { computeCutoff } = await import('@/app/api/admin/stats/route');
    const result = computeCutoff('30d', 'America/Caracas');
    expect(result).toBeInstanceOf(Date);
  });

  it('returns a Date for range=year', async () => {
    const { computeCutoff } = await import('@/app/api/admin/stats/route');
    const result = computeCutoff('year', 'America/Caracas');
    expect(result).toBeInstanceOf(Date);
  });

  it('7d cutoff is approximately 7 days ago', async () => {
    const { computeCutoff } = await import('@/app/api/admin/stats/route');
    const cutoff = computeCutoff('7d', 'America/Caracas')!;
    const diffMs = Date.now() - cutoff.getTime();
    // 7 days = 604800000ms. Allow 24h tolerance for Caracas timezone offset.
    expect(diffMs).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThan(8 * 24 * 60 * 60 * 1000);
  });
});

describe('decimalToNumber', () => {
  it('converts Decimal-like object to number', async () => {
    const { decimalToNumber } = await import('@/app/api/admin/stats/route');
    expect(decimalToNumber({ toNumber: () => 42.5 })).toBe(42.5);
  });

  it('converts string to number', async () => {
    const { decimalToNumber } = await import('@/app/api/admin/stats/route');
    expect(decimalToNumber('99.99')).toBe(99.99);
  });

  it('returns 0 for null', async () => {
    const { decimalToNumber } = await import('@/app/api/admin/stats/route');
    expect(decimalToNumber(null)).toBe(0);
  });

  it('returns 0 for undefined', async () => {
    const { decimalToNumber } = await import('@/app/api/admin/stats/route');
    expect(decimalToNumber(undefined)).toBe(0);
  });

  it('returns value for number directly', async () => {
    const { decimalToNumber } = await import('@/app/api/admin/stats/route');
    expect(decimalToNumber(50)).toBe(50);
  });

  it('returns 0 for non-finite number', async () => {
    const { decimalToNumber } = await import('@/app/api/admin/stats/route');
    expect(decimalToNumber(NaN)).toBe(0);
    expect(decimalToNumber(Infinity)).toBe(0);
  });
});

describe('storedTotalToUsd', () => {
  it('returns rounded amount when no exchange rate (legacy USD)', async () => {
    const { storedTotalToUsd } = await import('@/app/api/admin/stats/route');
    expect(storedTotalToUsd(100.456, null)).toBe(100.46);
  });

  it('divides by exchange rate when present (modern Bs)', async () => {
    const { storedTotalToUsd } = await import('@/app/api/admin/stats/route');
    expect(storedTotalToUsd(1000, 50)).toBe(20.0);
  });

  it('returns 0 for 0 total', async () => {
    const { storedTotalToUsd } = await import('@/app/api/admin/stats/route');
    expect(storedTotalToUsd(0, null)).toBe(0);
  });

  it('rounds to 2 decimals', async () => {
    const { storedTotalToUsd } = await import('@/app/api/admin/stats/route');
    expect(storedTotalToUsd(33.3333, null)).toBe(33.33);
    expect(storedTotalToUsd(100, 3)).toBe(33.33);
  });
});

describe('isValidRevenueStatus', () => {
  it('returns true for En Proceso', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('En Proceso')).toBe(true);
  });

  it('returns true for Enviado', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('Enviado')).toBe(true);
  });

  it('returns true for Entregado', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('Entregado')).toBe(true);
  });

  it('returns false for Pendiente', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('Pendiente')).toBe(false);
  });

  it('returns false for Cancelado', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('Cancelado')).toBe(false);
  });

  it('returns false for Pendiente verificación Binance', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('Pendiente verificación Binance')).toBe(false);
  });

  it('returns false for unknown status', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('Unknown')).toBe(false);
  });
});

describe('periodDate', () => {
  it('uses paidAt when present', async () => {
    const { periodDate } = await import('@/app/api/admin/stats/route');
    const paidAt = new Date('2026-07-10T14:00:00Z');
    const createdAt = new Date('2026-07-09T10:00:00Z');
    const result = periodDate({ paidAt, createdAt });
    expect(result.toISOString()).toBe(paidAt.toISOString());
  });

  it('falls back to createdAt when paidAt is null', async () => {
    const { periodDate } = await import('@/app/api/admin/stats/route');
    const createdAt = new Date('2026-07-09T10:00:00Z');
    const result = periodDate({ paidAt: null, createdAt });
    expect(result.toISOString()).toBe(createdAt.toISOString());
  });
});

describe('buildPeriodStats / toSummary', () => {
  it('calculates summary from empty input', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const stats = buildPeriodStats([], []);
    expect(stats.validatedOrders).toHaveLength(0);
    expect(stats.allPeriodOrders).toHaveLength(0);

    const summary = toSummary(stats);
    expect(summary.revenue).toBe(0);
    expect(summary.orderCount).toBe(0);
    expect(summary.paidOrderCount).toBe(0);
    expect(summary.averageTicket).toBe(0);
    expect(summary.cancellationRate).toBe(0);
  });

  it('calculates summary with validated orders', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 200 }, status: 'Entregado', paymentMethod: 'Zelle', paidAt: new Date('2026-07-10') }),
      mockOrder({ id: 'o2', total: { toNumber: () => 100 }, status: 'En Proceso', paymentMethod: 'Pago Móvil', paidAt: new Date('2026-07-11') }),
      mockOrder({ id: 'o3', total: { toNumber: () => 50 }, status: 'Cancelado', paymentMethod: 'Efectivo', paidAt: null }),
    ];
    const stats = buildPeriodStats(orders, []);
    expect(stats.validatedOrders).toHaveLength(2);
    expect(stats.allPeriodOrders).toHaveLength(3);

    const summary = toSummary(stats);
    // Revenue: 200 + 100 = 300 USD (all legacy)
    expect(summary.revenue).toBe(300);
    expect(summary.orderCount).toBe(3);
    expect(summary.paidOrderCount).toBe(2);
    // Average ticket: 300 / 2
    expect(summary.averageTicket).toBe(150);
    // Cancellation rate: 1 / (2 + 1) = 33.33%
    expect(summary.cancellationRate).toBe(33.33);
  });

  it('converts Bs total to USD using exchange rate', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 1000 }, exchangeRateUsdBs: { toNumber: () => 50 }, status: 'Entregado' }),
    ];
    const stats = buildPeriodStats(orders, []);
    const summary = toSummary(stats);
    // 1000 / 50 = 20 USD
    expect(summary.revenue).toBe(20);
    expect(summary.paidOrderCount).toBe(1);
  });

  it('cancellation rate with no cancelled orders', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Entregado' }),
    ];
    const stats = buildPeriodStats(orders, []);
    const summary = toSummary(stats);
    expect(summary.cancellationRate).toBe(0);
  });

  it('cancellation rate with only cancelled orders', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Cancelado' }),
    ];
    const stats = buildPeriodStats(orders, []);
    const summary = toSummary(stats);
    expect(summary.cancellationRate).toBe(100);
  });
});

describe('aggregateDaily', () => {
  it('returns empty array for no validated orders', async () => {
    const { aggregateDaily } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ status: 'Cancelado' }),
    ];
    const result = aggregateDaily(orders, 'America/Caracas');
    expect(result).toHaveLength(0);
  });

  it('groups by date in Caracas timezone', async () => {
    const { aggregateDaily } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Entregado', paidAt: new Date('2026-07-10T04:00:00Z') }), // Should be 2026-07-10 in VET (UTC-4)
      mockOrder({ id: 'o2', total: { toNumber: () => 50 }, status: 'En Proceso', paidAt: new Date('2026-07-10T05:00:00Z') }), // Also 2026-07-10 in VET
    ];
    const result = aggregateDaily(orders, 'America/Caracas');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-07-10');
    expect(result[0].revenue).toBe(150);
    expect(result[0].orders).toBe(2);
  });

  it('separates dates correctly across Day boundary', async () => {
    const { aggregateDaily } = await import('@/app/api/admin/stats/route');
    // VET is UTC-4: 2026-07-10T03:59:59Z = 2026-07-09T23:59:59 VET (Jul 9)
    // 2026-07-10T04:00:00Z = 2026-07-10T00:00:00 VET (Jul 10)
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Entregado', paidAt: new Date('2026-07-10T03:59:59Z') }),
      mockOrder({ id: 'o2', total: { toNumber: () => 50 }, status: 'Entregado', paidAt: new Date('2026-07-10T04:00:00Z') }),
    ];
    const result = aggregateDaily(orders, 'America/Caracas');
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-07-09');
    expect(result[1].date).toBe('2026-07-10');
  });

  it('returns sorted by date', async () => {
    const { aggregateDaily } = await import('@/app/api/admin/stats/route');
    // VET is UTC-4: 2026-07-10T04:00:00Z = 2026-07-10 in VET
    // 2026-07-11T04:00:00Z = 2026-07-11 in VET
    const orders = [
      mockOrder({ id: 'o2', total: { toNumber: () => 50 }, status: 'Entregado', paidAt: new Date('2026-07-11T04:00:00Z') }),
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Entregado', paidAt: new Date('2026-07-10T04:00:00Z') }),
    ];
    const result = aggregateDaily(orders, 'America/Caracas');
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-07-10');
    expect(result[1].date).toBe('2026-07-11');
  });
});

describe('aggregateByStatus', () => {
  it('returns status counts', async () => {
    const { aggregateByStatus } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ status: 'Entregado' }),
      mockOrder({ status: 'Pendiente' }),
      mockOrder({ status: 'Entregado' }),
      mockOrder({ status: 'Cancelado' }),
    ];
    const result = aggregateByStatus(orders);
    expect(result).toHaveLength(3);
    const entregado = result.find((s) => s.status === 'Entregado')!;
    expect(entregado.count).toBe(2);
    const pendiente = result.find((s) => s.status === 'Pendiente')!;
    expect(pendiente.count).toBe(1);
  });

  it('returns sorted by count descending', async () => {
    const { aggregateByStatus } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ status: 'Pendiente' }),
      mockOrder({ status: 'Entregado' }),
      mockOrder({ status: 'Entregado' }),
    ];
    const result = aggregateByStatus(orders);
    expect(result[0].status).toBe('Entregado');
    expect(result[0].count).toBe(2);
  });
});

describe('aggregateByPayment', () => {
  it('returns payment method stats for validated orders only', async () => {
    const { aggregateByPayment } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ paymentMethod: 'Pago Móvil', total: { toNumber: () => 100 }, status: 'Entregado' }),
      mockOrder({ paymentMethod: 'Zelle', total: { toNumber: () => 200 }, status: 'En Proceso' }),
      mockOrder({ paymentMethod: 'Pago Móvil', total: { toNumber: () => 50 }, status: 'Cancelado' }), // Should be ignored
    ];
    const result = aggregateByPayment(orders);
    expect(result).toHaveLength(2);
    const pm = result.find((m) => m.method === 'Pago Móvil')!;
    expect(pm.count).toBe(1);
    expect(pm.revenue).toBe(100);
    const zelle = result.find((m) => m.method === 'Zelle')!;
    expect(zelle.count).toBe(1);
    expect(zelle.revenue).toBe(200);
  });

  it('ignores non-validated statuses', async () => {
    const { aggregateByPayment } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ paymentMethod: 'Pago Móvil', total: { toNumber: () => 100 }, status: 'Pendiente' }),
    ];
    const result = aggregateByPayment(orders);
    expect(result).toHaveLength(0);
  });
});

describe('aggregateTopProducts', () => {
  it('returns top products by revenue', async () => {
    const { aggregateTopProducts } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 250 }, status: 'Entregado' }),
    ];
    const items = [
      mockItem({ orderId: 'o1', productId: 'p1', productName: 'Producto A', quantity: 2, price: { toNumber: () => 25 } }),
      mockItem({ orderId: 'o1', productId: 'p2', productName: 'Producto B', quantity: 3, price: { toNumber: () => 50 } }),
    ];
    const result = aggregateTopProducts(items, orders, { take: 20 });
    expect(result).toHaveLength(2);
    expect(result[0].productId).toBe('p2');
    expect(result[0].revenue).toBe(150);
    expect(result[0].quantity).toBe(3);
    expect(result[1].productId).toBe('p1');
    expect(result[1].revenue).toBe(50);
    expect(result[1].quantity).toBe(2);
  });

  it('ignores items from non-validated orders', async () => {
    const { aggregateTopProducts } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Cancelado' }),
    ];
    const items = [
      mockItem({ orderId: 'o1', productId: 'p1', productName: 'Producto A', quantity: 2, price: { toNumber: () => 25 } }),
    ];
    const result = aggregateTopProducts(items, orders, { take: 20 });
    expect(result).toHaveLength(0);
  });

  it('limits results with take', async () => {
    const { aggregateTopProducts } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Entregado' }),
    ];
    const items = [
      mockItem({ orderId: 'o1', productId: 'p1', productName: 'P1', quantity: 1, price: { toNumber: () => 10 } }),
      mockItem({ orderId: 'o1', productId: 'p2', productName: 'P2', quantity: 1, price: { toNumber: () => 20 } }),
      mockItem({ orderId: 'o1', productId: 'p3', productName: 'P3', quantity: 1, price: { toNumber: () => 30 } }),
    ];
    const result = aggregateTopProducts(items, orders, { take: 2 });
    expect(result).toHaveLength(2);
  });

  it('uses storedTotalToUsd for Bs items', async () => {
    const { aggregateTopProducts } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 200 }, exchangeRateUsdBs: { toNumber: () => 50 }, status: 'Entregado' }),
    ];
    const items = [
      mockItem({ orderId: 'o1', productId: 'p1', productName: 'Producto Bs', quantity: 1, price: { toNumber: () => 200 } }),
    ];
    const result = aggregateTopProducts(items, orders, { take: 20 });
    expect(result).toHaveLength(1);
    // 200 / 50 = 4 USD
    expect(result[0].revenue).toBe(4);
  });
});

// ── API handler tests (integration with mocks) ──────────────────────────────

describe('GET /api/admin/stats', () => {
  let handler: typeof import('@/app/api/admin/stats/route').GET;
  let requireAdmin: typeof import('@/lib/api-auth').requireAdmin;

  beforeEach(async () => {
    vi.clearAllMocks();
    handler = (await import('@/app/api/admin/stats/route')).GET;
    requireAdmin = (await import('@/lib/api-auth')).requireAdmin;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve 403 si no es ADMIN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 }) as never,
    });

    const request = new Request('http://localhost:3000/api/admin/stats');
    const response = await handler(request);
    expect(response.status).toBe(403);
  });

  it('devuelve 200 con DTO completo para range=all', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.order.findMany).mockResolvedValue([
      mockOrder({ id: 'o1', total: { toNumber: () => 100 as const }, status: 'Entregado' }),
    ] as never);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      mockItem({ orderId: 'o1', quantity: 1, productName: 'P1', price: { toNumber: () => 100 as const } }),
    ] as never);

    const request = new Request('http://localhost:3000/api/admin/stats?range=all');
    const response = await handler(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const body = await response.json();
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('previousSummary');
    expect(body).toHaveProperty('daily');
    expect(body).toHaveProperty('byStatus');
    expect(body).toHaveProperty('byPayment');
    expect(body).toHaveProperty('topProducts');

    // No PII
    const jsonStr = JSON.stringify(body);
    expect(jsonStr).not.toMatch(/customerEmail|customerPhone|customerIdNumber|shippingAddress|paymentReference/i);

    expect(body.summary.revenue).toBe(100);
    expect(body.summary.paidOrderCount).toBe(1);
    expect(body.summary.orderCount).toBe(1);
    // all → previousSummary = null
    expect(body.previousSummary).toBeNull();
  });

  it('devuelve previousSummary para rango acotado', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    // Mock for current period
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([
        mockOrder({ id: 'o1', total: { toNumber: () => 100 as const }, status: 'Entregado' }),
      ] as never) // current period
      .mockResolvedValueOnce([
        mockOrder({ id: 'o2', total: { toNumber: () => 200 as const }, status: 'En Proceso' }),
      ] as never); // previous period

    vi.mocked(prisma.orderItem.findMany)
      .mockResolvedValueOnce([] as never) // current items
      .mockResolvedValueOnce([] as never); // previous items

    const request = new Request('http://localhost:3000/api/admin/stats?range=7d');
    const response = await handler(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.previousSummary).not.toBeNull();
    // Previous period should have revenue of 200
    expect(body.previousSummary.revenue).toBe(200);
    expect(body.summary.revenue).toBe(100);
  });

  it('devuelve 400 para range inválido', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    const request = new Request('http://localhost:3000/api/admin/stats?range=invalid');
    const response = await handler(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/Rango inválido/);
  });

  it('no contiene PII en la respuesta', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([] as never);

    const request = new Request('http://localhost:3000/api/admin/stats?range=30d');
    const response = await handler(request);
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toMatch(/customerEmail|customerPhone|customerIdNumber|shippingAddress|paymentReference|customerName|paymentProofUrl|customerId/i);
  });

  it('maneja error de BD con 500', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.order.findMany).mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost:3000/api/admin/stats?range=30d');
    const response = await handler(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});
