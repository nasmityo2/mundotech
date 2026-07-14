import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequirePermissionAction = vi.fn();
const mockSendPaymentValidatedEmail = vi.fn();
const mockRevalidatePath = vi.fn();
const mockTransaction = vi.fn();
const mockOrderFindUnique = vi.fn();

vi.mock('@/lib/admin-access-server', () => ({
  requirePermissionAction: (...args: unknown[]) => mockRequirePermissionAction(...args),
  requirePermission: (...args: unknown[]) => mockRequirePermissionAction(...args),
  requireSuperAdminAction: (...args: unknown[]) => mockRequirePermissionAction(...args),
}));

vi.mock('@/lib/resend', () => ({
  sendPaymentValidatedEmail: (...args: unknown[]) => mockSendPaymentValidatedEmail(...args),
  sendPaymentRejectedEmail: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
    },
  },
}));

function fullOrderStub() {
  return {
    id: 'order-wa-1',
    orderNumber: 42,
    status: 'En Proceso',
    customerEmail: 'cliente@test.com',
    customerName: 'Cliente WhatsApp',
    customer: { email: 'cliente@test.com', name: 'Cliente WhatsApp' },
    items: [{ id: 'item-1', productId: 'prod-1', quantity: 1, productName: 'Prod', price: 10 }],
    stockDeducted: true,
    channel: 'whatsapp',
    createdAt: new Date(),
    updatedAt: new Date(),
    total: 10,
    paymentMethod: 'Pago Móvil',
    shippingAddress: 'Av 1',
    shippingCity: 'Barquisimeto',
    shippingState: 'Lara',
    shippingZipCode: 'N/A',
    shippingCountry: 'Venezuela',
  };
}

function makeWhatsAppTx(overrides: {
  claimCount?: number;
  onOrderUpdateMany?: () => void;
  onProductUpdateMany?: () => void;
} = {}) {
  const callOrder: string[] = [];
  const claimCount = overrides.claimCount ?? 1;

  const orderUpdateMany = vi.fn().mockImplementation(async () => {
    callOrder.push('order.updateMany');
    overrides.onOrderUpdateMany?.();
    return { count: claimCount };
  });
  const productUpdateMany = vi.fn().mockImplementation(async () => {
    callOrder.push('product.updateMany');
    overrides.onProductUpdateMany?.();
    return { count: 1 };
  });

  const tx = {
    order: {
      updateMany: orderUpdateMany,
      findUnique: vi.fn().mockResolvedValue(fullOrderStub()),
    },
    orderItem: {
      findMany: vi.fn().mockResolvedValue([{ productId: 'prod-1', quantity: 1 }]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([{ id: 'prod-1', name: 'Producto WhatsApp' }]),
      updateMany: productUpdateMany,
    },
  };

  return { tx, callOrder, orderUpdateMany, productUpdateMany };
}

describe('validateOrderPayment — WhatsApp claim-first (unit)', () => {
  let validateOrderPayment: typeof import('@/app/actions/orderActions').validateOrderPayment;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRequirePermissionAction.mockResolvedValue({ user: { email: 'admin@test.com' } });
    mockSendPaymentValidatedEmail.mockResolvedValue(undefined);
    validateOrderPayment = (await import('@/app/actions/orderActions')).validateOrderPayment;
  });

  afterEach(() => {
    vi.resetModules();
  });

  function stubPendingWhatsAppOrder() {
    mockOrderFindUnique
      .mockResolvedValueOnce({ id: 'order-wa-1', status: 'Pendiente' })
      .mockResolvedValueOnce({ stockDeducted: false, items: [{ productId: 'prod-1', quantity: 1 }] });
  }

  it('reclama la orden (order.updateMany) antes de product.updateMany', async () => {
    stubPendingWhatsAppOrder();
    const { tx, callOrder } = makeWhatsAppTx();
    mockTransaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));

    const result = await validateOrderPayment('order-wa-1');

    expect(result.success).toBe(true);
    expect(callOrder.indexOf('order.updateMany')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('product.updateMany')).toBeGreaterThan(callOrder.indexOf('order.updateMany'));
    expect(mockSendPaymentValidatedEmail).toHaveBeenCalledTimes(1);
  });

  it('con claim.count===0 no llama product.updateMany', async () => {
    mockOrderFindUnique
      .mockResolvedValueOnce({ id: 'order-wa-1', status: 'Pendiente' })
      .mockResolvedValueOnce({ stockDeducted: false, items: [{ productId: 'prod-1', quantity: 1 }] })
      .mockResolvedValueOnce({ status: 'En Proceso' })
      .mockResolvedValueOnce(fullOrderStub());
    const { tx, productUpdateMany } = makeWhatsAppTx({ claimCount: 0 });
    mockTransaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));

    const result = await validateOrderPayment('order-wa-1');

    expect(result.success).toBe(true);
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(mockSendPaymentValidatedEmail).not.toHaveBeenCalled();
  });
});
