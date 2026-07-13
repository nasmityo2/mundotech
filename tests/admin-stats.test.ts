import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  ANALYTICS_TIMEZONE,
  caracasDayStartUtc,
  computeStatsPeriodBounds,
  formatCaracasDateKey,
  storedTotalToUsd,
} from '@/lib/analytics-orders';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
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

function emptyOperationalMocks() {
  vi.mocked(prisma.order.count).mockResolvedValue(0);
  vi.mocked(prisma.order.groupBy).mockResolvedValue([]);
}

function emptyRevenueMocks() {
  vi.mocked(prisma.$queryRaw)
    .mockResolvedValueOnce([{ revenue: 0, paid_count: 0 }]) // revenue snapshot
    .mockResolvedValueOnce([]) // daily
    .mockResolvedValueOnce([]) // by payment
    .mockResolvedValueOnce([]); // top products
}

// ── Timezone / period bounds ─────────────────────────────────────────────────

describe('caracasDayStartUtc', () => {
  it('03:59:59Z pertenece al día anterior en Caracas', () => {
    const start = caracasDayStartUtc(new Date('2026-07-10T03:59:59Z'));
    expect(start.toISOString()).toBe('2026-07-09T04:00:00.000Z');
  });

  it('04:00:00Z inicia el día calendario Caracas', () => {
    const start = caracasDayStartUtc(new Date('2026-07-10T04:00:00Z'));
    expect(start.toISOString()).toBe('2026-07-10T04:00:00.000Z');
  });
});

describe('formatCaracasDateKey', () => {
  it('asigna 03:59:59Z al día anterior y 04:00:00Z al día actual', () => {
    expect(formatCaracasDateKey(new Date('2026-07-10T03:59:59Z'))).toBe('2026-07-09');
    expect(formatCaracasDateKey(new Date('2026-07-10T04:00:00Z'))).toBe('2026-07-10');
  });
});

describe('computeStatsPeriodBounds', () => {
  const now = new Date('2026-07-10T15:00:00Z');

  it('returns null bounds for range=all', () => {
    const bounds = computeStatsPeriodBounds('all', now);
    expect(bounds.start).toBeNull();
    expect(bounds.previousStart).toBeNull();
    expect(bounds.end).toEqual(now);
  });

  it('7d incluye hoy + 6 días previos con end=now', () => {
    const bounds = computeStatsPeriodBounds('7d', now);
    expect(bounds.start?.toISOString()).toBe('2026-07-04T04:00:00.000Z');
    expect(bounds.end).toEqual(now);
  });

  it('previous es el período inmediato anterior de igual duración', () => {
    const bounds = computeStatsPeriodBounds('7d', now);
    const duration = bounds.end.getTime() - bounds.start!.getTime();
    expect(bounds.previousEnd).toEqual(bounds.start);
    expect(bounds.previousStart!.getTime()).toBe(bounds.start!.getTime() - duration);
  });
});

describe('storedTotalToUsd', () => {
  it('returns rounded amount when no exchange rate (legacy USD)', () => {
    expect(storedTotalToUsd(100.456, null)).toBe(100.46);
  });

  it('divides by exchange rate when present (modern Bs)', () => {
    expect(storedTotalToUsd(1000, 50)).toBe(20.0);
  });
});

// ── Pure logic tests ─────────────────────────────────────────────────────────

describe('isValidRevenueStatus', () => {
  it('returns true for validated pipeline statuses', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('En Proceso')).toBe(true);
    expect(isValidRevenueStatus('Enviado')).toBe(true);
    expect(isValidRevenueStatus('Entregado')).toBe(true);
  });

  it('returns false for pending/cancelled statuses', async () => {
    const { isValidRevenueStatus } = await import('@/app/api/admin/stats/route');
    expect(isValidRevenueStatus('Pendiente')).toBe(false);
    expect(isValidRevenueStatus('Cancelado')).toBe(false);
    expect(isValidRevenueStatus('Pendiente verificación Binance')).toBe(false);
  });
});

describe('periodDate', () => {
  it('uses paidAt when present', async () => {
    const { periodDate } = await import('@/app/api/admin/stats/route');
    const paidAt = new Date('2026-07-10T14:00:00Z');
    const createdAt = new Date('2026-07-09T10:00:00Z');
    expect(periodDate({ paidAt, createdAt }).toISOString()).toBe(paidAt.toISOString());
  });

  it('falls back to createdAt when paidAt is null (legacy)', async () => {
    const { periodDate } = await import('@/app/api/admin/stats/route');
    const createdAt = new Date('2026-07-09T10:00:00Z');
    expect(periodDate({ paidAt: null, createdAt }).toISOString()).toBe(createdAt.toISOString());
  });
});

describe('buildPeriodStats / toSummary — separación createdAt vs paidAt', () => {
  const bounds = computeStatsPeriodBounds('7d', new Date('2026-07-10T15:00:00Z'));

  it('creado antes del período pero pagado dentro cuenta solo en ingreso', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({
        id: 'o1',
        total: { toNumber: () => 200 },
        status: 'Entregado',
        createdAt: new Date('2026-07-01T12:00:00Z'),
        paidAt: new Date('2026-07-10T10:00:00Z'),
      }),
    ];
    const stats = buildPeriodStats(orders, [], bounds);
    const summary = toSummary(stats);

    expect(summary.paidOrderCount).toBe(1);
    expect(summary.revenue).toBe(200);
    expect(summary.orderCount).toBe(0);
  });

  it('creado dentro del período pero pagado después cuenta solo como pedido operativo', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({
        id: 'o1',
        total: { toNumber: () => 150 },
        status: 'Entregado',
        createdAt: new Date('2026-07-08T12:00:00Z'),
        paidAt: new Date('2026-07-20T10:00:00Z'),
      }),
    ];
    const stats = buildPeriodStats(orders, [], bounds);
    const summary = toSummary(stats);

    expect(summary.orderCount).toBe(1);
    expect(summary.paidOrderCount).toBe(0);
    expect(summary.revenue).toBe(0);
  });

  it('legacy sin paidAt usa createdAt para ingreso si está validado', async () => {
    const { buildPeriodStats, toSummary } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({
        id: 'o1',
        total: { toNumber: () => 80 },
        status: 'Entregado',
        createdAt: new Date('2026-07-08T12:00:00Z'),
        paidAt: null,
      }),
    ];
    const stats = buildPeriodStats(orders, [], bounds);
    const summary = toSummary(stats);

    expect(summary.paidOrderCount).toBe(1);
    expect(summary.revenue).toBe(80);
    expect(summary.orderCount).toBe(1);
  });
});

describe('aggregateDaily', () => {
  const bounds = computeStatsPeriodBounds('7d', new Date('2026-07-10T15:00:00Z'));

  it('separates 03:59:59Z and 04:00:00Z across Caracas day boundary', async () => {
    const { aggregateDaily } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 100 }, status: 'Entregado', paidAt: new Date('2026-07-10T03:59:59Z') }),
      mockOrder({ id: 'o2', total: { toNumber: () => 50 }, status: 'Entregado', paidAt: new Date('2026-07-10T04:00:00Z') }),
    ];
    const result = aggregateDaily(orders, bounds);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-07-09');
    expect(result[1].date).toBe('2026-07-10');
  });
});

describe('aggregateByStatus', () => {
  const bounds = computeStatsPeriodBounds('7d', new Date('2026-07-10T15:00:00Z'));

  it('counts only orders created in period', async () => {
    const { aggregateByStatus } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ status: 'Entregado', createdAt: new Date('2026-07-08T12:00:00Z') }),
      mockOrder({ status: 'Pendiente', createdAt: new Date('2026-07-01T12:00:00Z') }),
    ];
    const result = aggregateByStatus(orders, bounds);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('Entregado');
  });
});

describe('aggregateByPayment', () => {
  const bounds = computeStatsPeriodBounds('7d', new Date('2026-07-10T15:00:00Z'));

  it('aggregates only revenue-period validated orders', async () => {
    const { aggregateByPayment } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ paymentMethod: 'Pago Móvil', total: { toNumber: () => 100 }, status: 'Entregado', paidAt: new Date('2026-07-09T10:00:00Z') }),
      mockOrder({ paymentMethod: 'Zelle', total: { toNumber: () => 200 }, status: 'Entregado', createdAt: new Date('2026-07-08T10:00:00Z'), paidAt: new Date('2026-07-20T10:00:00Z') }),
    ];
    const result = aggregateByPayment(orders, bounds);
    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('Pago Móvil');
    expect(result[0].revenue).toBe(100);
  });
});

describe('aggregateTopProducts', () => {
  const bounds = computeStatsPeriodBounds('7d', new Date('2026-07-10T15:00:00Z'));

  it('uses order exchange rate for item revenue in USD', async () => {
    const { aggregateTopProducts } = await import('@/app/api/admin/stats/route');
    const orders = [
      mockOrder({ id: 'o1', total: { toNumber: () => 200 }, exchangeRateUsdBs: { toNumber: () => 50 }, status: 'Entregado', paidAt: new Date('2026-07-09T10:00:00Z') }),
    ];
    const items = [
      mockItem({ orderId: 'o1', productId: 'p1', productName: 'Producto Bs', quantity: 1, price: { toNumber: () => 200 } }),
    ];
    const result = aggregateTopProducts(items, orders, bounds, { take: 20 });
    expect(result[0].revenue).toBe(4);
  });
});

// ── API handler tests ───────────────────────────────────────────────────────

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

    const response = await handler(new Request('http://localhost:3000/api/admin/stats'));
    expect(response.status).toBe(403);
  });

  it('devuelve 400 para tz distinta de America/Caracas', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    const response = await handler(new Request('http://localhost:3000/api/admin/stats?range=7d&tz=UTC'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Timezone inválida/);
  });

  it('range=all usa agregaciones y no findMany masivo', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    emptyOperationalMocks();
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ revenue: 1_000_000, paid_count: 100_000 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await handler(new Request(`http://localhost:3000/api/admin/stats?range=all&tz=${ANALYTICS_TIMEZONE}`));
    expect(response.status).toBe(200);
    expect(prisma.order.findMany).not.toHaveBeenCalled();
    expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
    expect(prisma.order.count).toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalled();

    const body = await response.json();
    expect(body.summary.paidOrderCount).toBe(100_000);
    expect(body.summary.revenue).toBe(1_000_000);
    expect(body.previousSummary).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('devuelve previousSummary para rango acotado', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.order.count)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    vi.mocked(prisma.order.groupBy)
      .mockResolvedValueOnce([{ status: 'Entregado', _count: { _all: 3 } }] as never)
      .mockResolvedValueOnce([{ status: 'En Proceso', _count: { _all: 2 } }] as never);

    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ revenue: 100, paid_count: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ revenue: 200, paid_count: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await handler(new Request(`http://localhost:3000/api/admin/stats?range=7d&tz=${ANALYTICS_TIMEZONE}`));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.previousSummary).not.toBeNull();
    expect(body.previousSummary.revenue).toBe(200);
    expect(body.previousSummary.paidOrderCount).toBe(2);
    expect(body.summary.revenue).toBe(100);
  });

  it('devuelve 400 para range inválido', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    const response = await handler(new Request('http://localhost:3000/api/admin/stats?range=invalid'));
    expect(response.status).toBe(400);
  });

  it('no contiene PII en la respuesta', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    emptyOperationalMocks();
    emptyRevenueMocks();

    const response = await handler(new Request(`http://localhost:3000/api/admin/stats?range=30d&tz=${ANALYTICS_TIMEZONE}`));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toMatch(
      /customerEmail|customerPhone|customerIdNumber|shippingAddress|paymentReference|customerName|paymentProofUrl|customerId/i,
    );
  });

  it('maneja error de BD con 500', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.order.count).mockRejectedValue(new Error('DB error'));

    const response = await handler(new Request(`http://localhost:3000/api/admin/stats?range=30d&tz=${ANALYTICS_TIMEZONE}`));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});
