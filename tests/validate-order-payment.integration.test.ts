import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertE2eDatabaseUrl, confirmE2eDatabaseSchema } from '@/lib/e2e-db-guard';
import { createScriptPrisma } from '@/scripts/lib/script-prisma';
import { buildE2eDatabaseUrlFromEnvFile, canConnectToDatabase } from './helpers/e2e-database-url';

const mockRequireAdminAction = vi.fn();
const mockSendPaymentValidatedEmail = vi.fn();

vi.mock('@/lib/admin-access-server', () => ({
  requirePermissionAction: (...args: unknown[]) => mockRequireAdminAction(...args),
  requirePermission: (...args: unknown[]) => mockRequireAdminAction(...args),
  requireSuperAdminAction: (...args: unknown[]) => mockRequireAdminAction(...args),
}));

vi.mock('@/lib/resend', () => ({
  sendPaymentValidatedEmail: (...args: unknown[]) => mockSendPaymentValidatedEmail(...args),
  sendPaymentRejectedEmail: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const e2eUrl = process.env.E2E_INTEGRATION_DATABASE_URL ?? buildE2eDatabaseUrlFromEnvFile();
const describeWithDb = e2eUrl ? describe : describe.skip;

describeWithDb('validateOrderPayment — PostgreSQL E2E', () => {
  let prisma: ReturnType<typeof createScriptPrisma>;
  let validateOrderPayment: typeof import('@/app/actions/orderActions').validateOrderPayment;
  let dbReady = false;

  beforeAll(async () => {
    if (!e2eUrl) return;
    assertE2eDatabaseUrl(e2eUrl);
    dbReady = await canConnectToDatabase(e2eUrl);
    if (!dbReady) {
      throw new Error('[E2E] No se pudo conectar a la BD de integración (_e2e/test).');
    }

    vi.stubEnv('DATABASE_URL', e2eUrl);
    vi.stubEnv('DIRECT_URL', e2eUrl);
    vi.resetModules();

    prisma = createScriptPrisma();
    await confirmE2eDatabaseSchema(async () => {
      const rows = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
      return rows[0]?.current_database ?? '';
    });

    validateOrderPayment = (await import('@/app/actions/orderActions')).validateOrderPayment;
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    if (!dbReady) return;
    mockRequireAdminAction.mockResolvedValue({ user: { email: 'admin-integration@test.com' } });
    mockSendPaymentValidatedEmail.mockClear();

    await prisma.couponRedemption.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
  });

  async function seedWhatsAppPendingOrder(stock: number) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const product = await prisma.product.create({
      data: {
        name: `WA Integration ${suffix}`,
        slug: `wa-integration-${suffix}`,
        price: 10,
        stock,
        category: 'Test',
        images: [],
        isActive: true,
      },
    });

    const order = await prisma.order.create({
      data: {
        customerName: 'Cliente WA E2E',
        customerEmail: 'wa-e2e@test.com',
        total: 10,
        status: 'Pendiente',
        paymentMethod: 'Pago Móvil',
        shippingAddress: 'Av Test 1',
        shippingCity: 'Barquisimeto',
        shippingState: 'Lara',
        channel: 'whatsapp',
        stockDeducted: false,
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: 10,
          },
        },
      },
    });

    return { product, order };
  }

  it('dos validateOrderPayment concurrentes descuentan stock exactamente 1 vez', async () => {
    if (!dbReady) return;
    const { product, order } = await seedWhatsAppPendingOrder(5);

    const [first, second] = await Promise.all([
      validateOrderPayment(order.id),
      validateOrderPayment(order.id),
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });

    expect(updatedProduct?.stock).toBe(4);
    expect(updatedOrder?.status).toBe('En Proceso');
    expect(updatedOrder?.stockDeducted).toBe(true);
    expect(updatedOrder?.paidAt).not.toBeNull();
    expect(updatedProduct!.stock).toBeGreaterThanOrEqual(0);
    expect(mockSendPaymentValidatedEmail).toHaveBeenCalledTimes(1);
  });

  it('stock insuficiente deja orden Pendiente, stockDeducted false y stock intacto', async () => {
    if (!dbReady) return;
    const { product, order } = await seedWhatsAppPendingOrder(0);

    const result = await validateOrderPayment(order.id);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toMatch(/Stock insuficiente/i);
    }

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });

    expect(updatedProduct?.stock).toBe(0);
    expect(updatedOrder?.status).toBe('Pendiente');
    expect(updatedOrder?.stockDeducted).toBe(false);
    expect(updatedOrder?.paidAt).toBeNull();
    expect(mockSendPaymentValidatedEmail).not.toHaveBeenCalled();
  });
});
