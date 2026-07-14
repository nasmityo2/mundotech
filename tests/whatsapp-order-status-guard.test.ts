import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * OBJETIVO A: un pedido con `stockDeducted=false` (WhatsApp pendiente de
 * validar pago) no puede avanzar a En Proceso/Enviado/Entregado por las
 * rutas genéricas (individual o bulk). La única vía que descuenta stock y
 * avanza el estado es `validateOrderPayment()` («Validar pago»).
 */

const mockRequireAdmin = vi.fn();
const mockRejectInvalidMutationOrigin = vi.fn();
const mockOrderFindUnique = vi.fn();
const mockOrderFindMany = vi.fn();
const mockOrderUpdate = vi.fn();
const mockOrderUpdateMany = vi.fn();
const mockTransaction = vi.fn();
const mockApplyCancelEffects = vi.fn();
const mockSendShippingEmail = vi.fn();
const mockSendOrderDeliveredEmail = vi.fn();
const mockSendOrderCancelledEmail = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/security', () => ({
  rejectInvalidMutationOrigin: (...args: unknown[]) => mockRejectInvalidMutationOrigin(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
      updateMany: (...args: unknown[]) => mockOrderUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock('@/lib/checkout-order', () => ({
  applyOrderCancellationEffectsInTransaction: (...args: unknown[]) => mockApplyCancelEffects(...args),
}));

vi.mock('@/lib/resend', () => ({
  sendOrderDeliveredEmail: (...args: unknown[]) => mockSendOrderDeliveredEmail(...args),
  sendShippingEmail: (...args: unknown[]) => mockSendShippingEmail(...args),
  sendOrderCancelledEmail: (...args: unknown[]) => mockSendOrderCancelledEmail(...args),
}));

vi.mock('@/lib/safe-logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

const WHATSAPP_GUARD_MESSAGE =
  'Este pedido de WhatsApp aún no ha descontado inventario. Valida el pago con la acción «Validar pago» antes de avanzar el estado.';

function baseOrderRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 42,
    status: 'Pendiente',
    stockDeducted: false,
    channel: 'whatsapp',
    shippedAt: null,
    deliveredAt: null,
    trackingNumber: null,
    trackingCarrier: null,
    trackingUrl: null,
    trackingPhotoUrl: null,
    customerName: 'Cliente Test',
    customerEmail: 'cliente@test.com',
    customerPhone: null,
    customerIdNumber: null,
    customerId: null,
    total: 100,
    exchangeRateUsdBs: 50,
    paymentMethod: 'Pago Móvil',
    paymentBank: null,
    paymentHolderIdNumber: null,
    paymentHolderPhone: null,
    paymentReference: null,
    paymentProofUrl: null,
    paymentProofKey: null,
    paidAt: null,
    couponCode: null,
    couponDiscount: null,
    paymentVerifiedBy: null,
    paymentRejectionReason: null,
    notes: null,
    shippingAddress: 'Av. 1',
    shippingCity: 'Barquisimeto',
    shippingState: 'Lara',
    shippingZipCode: 'N/A',
    shippingCountry: 'Venezuela',
    createdAt: new Date(),
    items: [],
    customer: null,
    ...overrides,
  };
}

async function loadStatusPut() {
  return (await import('@/app/api/orders/[id]/status/route')).PUT;
}

function statusRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/orders/order-1/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/orders/[id]/status — guard stockDeducted=false (WhatsApp)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireAdmin.mockResolvedValue({ authorized: true, session: { user: { email: 'admin@mt.test' } } });
    mockRejectInvalidMutationOrigin.mockReturnValue(null);
  });

  it.each(['En Proceso', 'Enviado', 'Entregado'])(
    'rechaza con 409 al intentar avanzar a "%s" sin stock descontado, sin update ni email',
    async (status) => {
      mockOrderFindUnique.mockResolvedValue(baseOrderRecord());

      const PUT = await loadStatusPut();
      const response = await PUT(statusRequest({ status }), {
        params: Promise.resolve({ id: 'order-1' }),
      });

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.message).toBe(WHATSAPP_GUARD_MESSAGE);

      expect(mockOrderUpdate).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockSendShippingEmail).not.toHaveBeenCalled();
      expect(mockSendOrderDeliveredEmail).not.toHaveBeenCalled();
      expect(mockSendOrderCancelledEmail).not.toHaveBeenCalled();
    },
  );

  it('permite "Cancelado" con stockDeducted=false y no restaura stock (stockDeducted nunca se marcó descontado)', async () => {
    const record = baseOrderRecord();
    mockOrderFindUnique
      .mockResolvedValueOnce(record) // existing (select)
      .mockResolvedValueOnce({ ...record, items: [] }); // orderWithItems (full)

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        order: {
          update: vi.fn().mockResolvedValue({ ...record, status: 'Cancelado', customer: null }),
        },
      };
      return fn(tx);
    });

    const PUT = await loadStatusPut();
    const response = await PUT(statusRequest({ status: 'Cancelado' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(response.status).toBe(200);
    expect(mockApplyCancelEffects).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stockDeducted: false }),
    );
  });

  it('permite "Pendiente" (idempotente) con stockDeducted=false', async () => {
    const record = baseOrderRecord({ status: 'Pendiente' });
    mockOrderFindUnique.mockResolvedValue(record);
    mockOrderUpdate.mockResolvedValue({ ...record, customer: null });

    const PUT = await loadStatusPut();
    const response = await PUT(statusRequest({ status: 'Pendiente' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(response.status).toBe(200);
    expect(mockOrderUpdate).toHaveBeenCalled();
  });

  it('permite avanzar a "En Proceso" cuando stockDeducted=true', async () => {
    const record = baseOrderRecord({ stockDeducted: true, channel: 'web' });
    mockOrderFindUnique.mockResolvedValue(record);
    mockOrderUpdate.mockResolvedValue({ ...record, status: 'En Proceso', customer: null });

    const PUT = await loadStatusPut();
    const response = await PUT(statusRequest({ status: 'En Proceso' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(response.status).toBe(200);
    expect(mockOrderUpdate).toHaveBeenCalled();
  });
});

async function loadBulkPost() {
  return (await import('@/app/api/orders/bulk-status-update/route')).POST;
}

function bulkRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/orders/bulk-status-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/orders/bulk-status-update — guard stockDeducted=false (WhatsApp)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireAdmin.mockResolvedValue({ authorized: true, session: { user: { email: 'admin@mt.test' } } });
    mockRejectInvalidMutationOrigin.mockReturnValue(null);
  });

  it('rechaza TODA la operación (409, updatedCount:0) si hay mezcla de pedidos hacia "En Proceso"', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'order-web', status: 'Pendiente', stockDeducted: true, channel: 'web' },
      { id: 'order-wa', status: 'Pendiente', stockDeducted: false, channel: 'whatsapp' },
    ]);

    const POST = await loadBulkPost();
    const response = await POST(
      bulkRequest({ orderIds: ['order-web', 'order-wa'], status: 'En Proceso' }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.updatedCount).toBe(0);
    expect(body.message).toBe(WHATSAPP_GUARD_MESSAGE);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('permite "En Proceso" en bulk cuando todos tienen stockDeducted=true', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'order-web-1', status: 'Pendiente', stockDeducted: true, channel: 'web' },
      { id: 'order-web-2', status: 'Pendiente', stockDeducted: true, channel: 'web' },
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = { order: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) } };
      return fn(tx);
    });

    const POST = await loadBulkPost();
    const response = await POST(
      bulkRequest({ orderIds: ['order-web-1', 'order-web-2'], status: 'En Proceso' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.updatedCount).toBe(2);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('permite "Cancelado" en bulk aunque haya pedidos con stockDeducted=false', async () => {
    mockOrderFindMany
      .mockResolvedValueOnce([
        { id: 'order-wa', status: 'Pendiente', stockDeducted: false, channel: 'whatsapp' },
      ])
      .mockResolvedValueOnce([
        { id: 'order-wa', status: 'Pendiente', stockDeducted: false, channel: 'whatsapp', items: [], customerEmail: null, customerName: 'Cliente', orderNumber: 1 },
      ]);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        order: {
          findMany: mockOrderFindMany,
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return fn(tx);
    });

    const POST = await loadBulkPost();
    const response = await POST(
      bulkRequest({ orderIds: ['order-wa'], status: 'Cancelado' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.updatedCount).toBe(1);
  });
});
