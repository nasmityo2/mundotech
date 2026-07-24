import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePermissionMock = vi.fn();
vi.mock('@/lib/admin-access-server', () => ({
  requirePermission: requirePermissionMock,
}));

const rejectInvalidMutationOriginMock = vi.fn();
vi.mock('@/lib/security', () => ({
  rejectInvalidMutationOrigin: rejectInvalidMutationOriginMock,
}));

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const transactionMock = vi.fn();
const txFindUniqueMock = vi.fn();
const txUpdateMock = vi.fn();
const txUpdateManyMock = vi.fn();
const txProductUpdateManyMock = vi.fn();
const txCouponRedemptionFindUniqueMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock('@/lib/resend', () => ({
  sendOrderCancelledEmail: vi.fn(),
  sendShippingEmail: vi.fn(),
  sendOrderDeliveredEmail: vi.fn(),
}));

const logInfoMock = vi.fn();
vi.mock('@/lib/safe-logger', () => ({
  logInfo: logInfoMock,
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

const { PUT } = await import('@/app/api/orders/[id]/status/route');

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/orders/order-1/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeTx() {
  return {
    order: {
      findUnique: txFindUniqueMock,
      update: txUpdateMock,
      updateMany: txUpdateManyMock,
    },
    product: { updateMany: txProductUpdateManyMock },
    couponRedemption: {
      findUnique: txCouponRedemptionFindUniqueMock,
      update: vi.fn(),
    },
    coupon: { updateMany: vi.fn() },
  };
}

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 100,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    customerId: null,
    status: 'Pendiente',
    stockDeducted: true,
    total: 100,
    exchangeRateUsdBs: 36,
    paymentMethod: 'Binance',
    paymentMethodId: 'binancepay',
    subtotalBeforeDiscount: 100,
    paymentDiscountPercent: null,
    paymentDiscount: null,
    paymentCurrency: null,
    paymentBank: null,
    paymentHolderIdNumber: null,
    paymentHolderPhone: null,
    paymentReference: null,
    paymentProofUrl: null,
    paymentProofKey: null,
    shippedAt: null,
    trackingNumber: null,
    trackingCarrier: null,
    trackingPhotoUrl: null,
    trackingUrl: null,
    deliveredAt: null,
    paidAt: null,
    couponCode: null,
    couponDiscount: null,
    paymentVerifiedBy: null,
    paymentRejectionReason: null,
    notes: null,
    channel: 'web',
    freeShipping: false,
    customerName: 'Ana',
    customerEmail: 'ana@example.com',
    customerPhone: null,
    customerIdNumber: null,
    items: [
      {
        id: 'i1',
        productId: 'p1',
        productName: 'X',
        quantity: 2,
        price: 10,
        imageUrl: null,
        freeShipping: false,
      },
    ],
    customer: { email: null, name: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rejectInvalidMutationOriginMock.mockReturnValue(null);
  requirePermissionMock.mockResolvedValue({ authorized: true });
  transactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(makeTx()));
  txCouponRedemptionFindUniqueMock.mockResolvedValue(null);
  txProductUpdateManyMock.mockResolvedValue({ count: 1 });
  txUpdateManyMock.mockResolvedValue({ count: 1 });
});

describe('PUT /api/orders/[id]/status Cancelado', () => {
  it('restaura stock cuando Pendiente + stockDeducted=true', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'Pendiente',
      shippedAt: null,
      trackingNumber: null,
      deliveredAt: null,
      stockDeducted: true,
      channel: 'web',
    });
    const current = orderRow({ status: 'Pendiente', stockDeducted: true });
    txFindUniqueMock.mockResolvedValue(current);
    txUpdateMock.mockResolvedValue({ ...current, status: 'Cancelado' });

    const res = await PUT(buildRequest({ status: 'Cancelado' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(res.status).toBe(200);
    expect(txUpdateManyMock).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'Pendiente', stockDeducted: true },
      data: { stockDeducted: false },
    });
    expect(txProductUpdateManyMock).toHaveBeenCalled();
    expect(logInfoMock).toHaveBeenCalledWith(
      'order_cancelled_stock_reverted',
      expect.objectContaining({ orderId: 'order-1' }),
    );
  });

  it('ya Cancelado: no restaura (idempotente)', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'Cancelado',
      shippedAt: null,
      trackingNumber: null,
      deliveredAt: null,
      stockDeducted: false,
      channel: 'web',
    });
    txFindUniqueMock.mockResolvedValue(orderRow({ status: 'Cancelado', stockDeducted: false }));

    const res = await PUT(buildRequest({ status: 'Cancelado' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(res.status).toBe(200);
    expect(txUpdateManyMock).not.toHaveBeenCalled();
    expect(txProductUpdateManyMock).not.toHaveBeenCalled();
    expect(txUpdateMock).not.toHaveBeenCalled();
  });

  it('WhatsApp stockDeducted=false: cancela sin reponer', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'Pendiente',
      shippedAt: null,
      trackingNumber: null,
      deliveredAt: null,
      stockDeducted: false,
      channel: 'whatsapp',
    });
    const current = orderRow({ status: 'Pendiente', stockDeducted: false, channel: 'whatsapp' });
    txFindUniqueMock.mockResolvedValue(current);
    txUpdateMock.mockResolvedValue({ ...current, status: 'Cancelado' });

    const res = await PUT(buildRequest({ status: 'Cancelado' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(res.status).toBe(200);
    expect(txProductUpdateManyMock).not.toHaveBeenCalled();
    expect(logInfoMock).toHaveBeenCalledWith(
      'order_cancelled_no_stock_restore',
      expect.objectContaining({ orderId: 'order-1' }),
    );
  });

  it('Enviado: no restaura', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'Enviado',
      shippedAt: new Date(),
      trackingNumber: 'T1',
      deliveredAt: null,
      stockDeducted: true,
      channel: 'web',
    });
    const current = orderRow({ status: 'Enviado', stockDeducted: true });
    txFindUniqueMock.mockResolvedValue(current);
    txUpdateMock.mockResolvedValue({ ...current, status: 'Cancelado' });

    await PUT(buildRequest({ status: 'Cancelado' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(txProductUpdateManyMock).not.toHaveBeenCalled();
    expect(logInfoMock).toHaveBeenCalledWith(
      'order_cancelled_no_stock_restore',
      expect.objectContaining({ orderId: 'order-1' }),
    );
  });

  it('404 si la orden desaparece dentro de la tx', async () => {
    findUniqueMock.mockResolvedValue({
      status: 'Pendiente',
      shippedAt: null,
      trackingNumber: null,
      deliveredAt: null,
      stockDeducted: true,
      channel: 'web',
    });
    txFindUniqueMock.mockResolvedValue(null);

    const res = await PUT(buildRequest({ status: 'Cancelado' }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(res.status).toBe(404);
  });
});
