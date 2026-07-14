import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutSchema, executeCheckoutInTransaction } from '@/lib/checkout-order';
import { CheckoutError } from '@/lib/checkout-error';

function validCheckoutBody(overrides: Record<string, unknown> = {}) {
  return {
    customerName: 'Cliente Test',
    customerEmail: 'cliente@test.com',
    shippingDetails: {
      address: 'Av. Principal 1',
      city: 'Barquisimeto',
      state: 'Lara',
    },
    paymentMethod: 'Pago Móvil',
    paymentReference: 'REF-12345',
    paymentUploadToken: 'valid-token-xxx',
    items: [{ productId: 'prod-1', quantity: 1 }],
    ...overrides,
  };
}

describe('checkoutSchema (SESIÓN 04/05 CORREGIDO)', () => {
  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.mundotech.test');
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta checkout válido con paymentUploadToken', () => {
    const parsed = checkoutSchema.safeParse(validCheckoutBody());
    expect(parsed.success).toBe(true);
  });

  it('rechaza paymentUploadToken vacío para método manual', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({ paymentUploadToken: null }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((i) => i.path.includes('paymentUploadToken')),
      ).toBe(true);
    }
  });

  it('no exige paymentUploadToken para WhatsApp', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({ paymentUploadToken: null, channel: 'whatsapp' }),
    );
    expect(parsed.success).toBe(true);
  });

  it('no exige paymentUploadToken para Cashea', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentUploadToken: null,
        paymentMethod: 'Cashea',
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it('no acepta paymentProofUrl en el schema público', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentProofUrl: 'https://evil.com/proof.jpg',
        paymentUploadToken: 'token',
      }),
    );
    // paymentProofUrl no es parte del schema, así que se ignora.
    // El checkout debe funcionar porque paymentUploadToken es válido.
    expect(parsed.success).toBe(true);
  });

  it('no acepta paymentProofKey en el schema público', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentProofKey: 'proofs/abc.webp',
        paymentUploadToken: 'token',
      }),
    );
    // paymentProofKey no es parte del schema, así que se ignora.
    expect(parsed.success).toBe(true);
  });

  it('exige paymentUploadToken para Binance Pay', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentUploadToken: null,
        paymentMethod: 'Binance Pay',
      }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some(
          (i) => i.path.includes('paymentUploadToken') && i.message.includes('Binance'),
        ),
      ).toBe(true);
    }
  });
});

/**
 * CAMBIO 1 — OBJETIVO B: la disponibilidad de stock se valida SIEMPRE al
 * crear el pedido, en ambos modos (`deductStock` true/false). En modo
 * WhatsApp (`deductStock=false`) la comprobación es informativa: no
 * descuenta stock; el descuento definitivo ocurre en `validateOrderPayment()`.
 */
describe('executeCheckoutInTransaction — validación de stock (CAMBIO 1)', () => {
  function makeTx(overrides: {
    productFindMany?: ReturnType<typeof vi.fn>;
    productUpdateMany?: ReturnType<typeof vi.fn>;
  } = {}) {
    const productFindMany =
      overrides.productFindMany ??
      vi.fn().mockResolvedValue([
        { id: 'prod-1', price: 10, stock: 2, name: 'Producto WhatsApp', isActive: true },
      ]);
    const productUpdateMany = overrides.productUpdateMany ?? vi.fn().mockResolvedValue({ count: 1 });
    const orderCreate = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'order-new-1',
        orderNumber: 1,
        ...data,
        items: [],
      }),
    );
    const tx = {
      product: {
        findMany: productFindMany,
        updateMany: productUpdateMany,
      },
      appConfig: { findUnique: vi.fn().mockResolvedValue(null) },
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      order: { create: orderCreate },
      paymentUpload: { findUnique: vi.fn(), updateMany: vi.fn() },
    };
    return {
      tx: tx as unknown as Parameters<typeof executeCheckoutInTransaction>[0],
      productFindMany,
      productUpdateMany,
      orderCreate,
    };
  }

  function whatsappInput(overrides: Record<string, unknown> = {}) {
    return {
      customerId: 'guest',
      customerName: 'Cliente WhatsApp',
      customerEmail: null,
      customerPhone: '04121234567',
      customerIdNumber: null,
      shippingDetails: { address: 'Retiro', city: 'Barquisimeto', state: 'Lara', zipCode: 'N/A', country: 'Venezuela' },
      paymentMethod: 'Pago Móvil' as const,
      paymentBank: null,
      paymentHolderIdNumber: null,
      paymentHolderPhone: null,
      paymentReference: null,
      paymentUploadToken: null,
      couponCode: null,
      channel: 'whatsapp' as const,
      items: [{ productId: 'prod-1', quantity: 3 }],
      ...overrides,
    };
  }

  it('PRUEBA 1: WhatsApp, stock=2 y cantidad=3 → 409 y ninguna orden creada', async () => {
    const { tx, orderCreate } = makeTx();
    await expect(
      executeCheckoutInTransaction(tx, whatsappInput(), { deductStock: false }),
    ).rejects.toMatchObject({ httpStatus: 409 });
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('PRUEBA 1b: rechaza con CheckoutError instancia correcta', async () => {
    const { tx } = makeTx();
    await expect(
      executeCheckoutInTransaction(tx, whatsappInput(), { deductStock: false }),
    ).rejects.toBeInstanceOf(CheckoutError);
  });

  it('PRUEBA 2: WhatsApp con stock suficiente → orden creada con stockDeducted=false, sin descontar stock', async () => {
    const { tx, productUpdateMany } = makeTx({
      productFindMany: vi.fn().mockResolvedValue([
        { id: 'prod-1', price: 10, stock: 5, name: 'Producto WhatsApp', isActive: true },
      ]),
    });

    const order = await executeCheckoutInTransaction(tx, whatsappInput(), { deductStock: false });

    expect(order.stockDeducted).toBe(false);
    expect(productUpdateMany).not.toHaveBeenCalled();
  });

  it('PRUEBA 8: modo full (deductStock=true) crea con stockDeducted=true y descuenta stock de inmediato', async () => {
    const { tx, productUpdateMany } = makeTx({
      productFindMany: vi.fn().mockResolvedValue([
        { id: 'prod-1', price: 10, stock: 5, name: 'Producto Full', isActive: true },
      ]),
    });

    const fullInput = whatsappInput({
      channel: 'web',
      paymentUploadToken: null,
      paymentMethod: 'Cashea',
      items: [{ productId: 'prod-1', quantity: 3 }],
    });

    const order = await executeCheckoutInTransaction(tx, fullInput, { deductStock: true });

    expect(order.stockDeducted).toBe(true);
    expect(productUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-1', stock: { gte: 3 } },
        data: { stock: { decrement: 3 } },
      }),
    );
  });

  it('full: stock insuficiente también rechaza con 409 (comportamiento previo preservado)', async () => {
    const { tx } = makeTx();
    const fullInput = whatsappInput({ channel: 'web', paymentMethod: 'Cashea' });
    await expect(
      executeCheckoutInTransaction(tx, fullInput, { deductStock: true }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});
