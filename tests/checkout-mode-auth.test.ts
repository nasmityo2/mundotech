import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockGetServerSession = vi.fn();
const mockPaymentUploadCreate = vi.fn();
const mockPaymentUploadUpdateMany = vi.fn();

vi.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    paymentUpload: {
      create: (...args: unknown[]) => mockPaymentUploadCreate(...args),
      updateMany: (...args: unknown[]) => mockPaymentUploadUpdateMany(...args),
    },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimitCritical: vi.fn().mockResolvedValue({ limited: false, retryAfterSeconds: 0, source: 'memory' }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  hashForBucket: vi.fn().mockReturnValue('hashed-bucket'),
}));

vi.mock('@/lib/security', () => ({
  rejectInvalidMutationOrigin: vi.fn().mockReturnValue(null),
  hashToken: vi.fn().mockReturnValue('hashed-token'),
  buildRateLimitedResponse: vi.fn(),
}));

vi.mock('@/lib/checkout-order', () => ({
  checkoutSchema: {
    safeParse: vi.fn((body: Record<string, unknown>) => ({
      success: true,
      data: {
        customerName: body.customerName ?? 'Guest',
        customerPhone: body.customerPhone ?? '04121234567',
        customerEmail: body.customerEmail ?? null,
        customerIdNumber: body.customerIdNumber ?? null,
        shippingMethod: 'tienda',
        shippingDetails: { address: 'Retiro', city: 'Barquisimeto', state: 'Lara', zipCode: 'N/A', country: 'VE' },
        paymentMethod: 'Pago Móvil',
        paymentReference: null,
        items: [{ productId: 'prod-1', quantity: 1 }],
        channel: body.channel,
      },
    })),
  },
  executeCheckoutInTransaction: vi.fn(),
  findRecentDuplicateOrderInTransaction: vi.fn().mockResolvedValue(null),
}));

const mockReadSettings = vi.fn().mockResolvedValue({
  storeName: 'MT',
  address: 'Av 1',
  whatsappOrderPhone: '584121471338',
});

vi.mock('@/lib/data-store', () => ({
  readSettings: (...args: unknown[]) => mockReadSettings(...args),
}));

vi.mock('@/lib/resend', () => ({
  sendOrderConfirmationEmail: vi.fn(),
}));

vi.mock('@/lib/abandoned-cart', () => ({
  markCartRecovered: vi.fn(),
}));

vi.mock('@/lib/safe-logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock('@/lib/r2', () => ({
  uploadPrivateProof: vi.fn(),
  deletePrivateProof: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

vi.mock('@/lib/image-processing', () => ({
  processImageWithFallback: vi.fn().mockResolvedValue({
    buffer: Buffer.from([0xff, 0xd8, 0xff]),
    contentType: 'image/jpeg',
    ext: 'jpg',
    width: 100,
    height: 100,
  }),
}));

const AUTH_SESSION = { user: { id: 'user-abc', email: 'cliente@test.com' } };

function ordersPostBody(overrides: Record<string, unknown> = {}) {
  return {
    customerId: 'attacker-id',
    customerName: 'Invitado',
    customerPhone: '04121234567',
    shippingMethod: 'tienda',
    shippingDetails: { address: 'Retiro', city: 'Barquisimeto', state: 'Lara', zipCode: 'N/A', country: 'VE' },
    paymentMethod: 'Pago Móvil',
    items: [{ productId: 'prod-1', quantity: 1 }],
    ...overrides,
  };
}

async function loadOrdersPost() {
  return (await import('@/app/api/orders/route')).POST;
}

async function loadUploadSessionPost() {
  return (await import('@/app/api/checkout/upload-session/route')).POST;
}

async function loadUploadProofPost() {
  return (await import('@/app/api/checkout/upload-proof/route')).POST;
}

describe('checkout-mode auth matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetServerSession.mockResolvedValue(null);
    mockTransaction.mockReset();
    mockPaymentUploadCreate.mockResolvedValue({});
    mockPaymentUploadUpdateMany.mockResolvedValue({ count: 1 });
    mockReadSettings.mockReset();
    mockReadSettings.mockResolvedValue({
      storeName: 'MT',
      address: 'Av 1',
      whatsappOrderPhone: '584121471338',
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe('POST /api/orders', () => {
    it('WhatsApp + sin sesión: continúa y customerId guest', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'whatsapp');
      mockGetServerSession.mockResolvedValue(null);
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {};
        const checkoutOrder = await import('@/lib/checkout-order');
        vi.mocked(checkoutOrder.executeCheckoutInTransaction).mockResolvedValue({
          id: 'order-1',
          orderNumber: 42,
          customerId: null,
          items: [],
          status: 'Pendiente',
          createdAt: new Date(),
        } as never);
        return fn(tx);
      });
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'order-1',
        orderNumber: 42,
        customerId: null,
        customerEmail: null,
        customerName: 'Invitado',
        customerPhone: '04121234567',
        status: 'Pendiente',
        createdAt: new Date(),
        items: [],
        total: 100,
        exchangeRateUsdBs: 50,
        paymentMethod: 'Pago Móvil',
        paymentBank: null,
        paymentReference: null,
        shippingAddress: 'Retiro',
        shippingCity: 'Barquisimeto',
        shippingState: 'Lara',
        shippingZipCode: 'N/A',
        shippingCountry: 'VE',
        trackingCarrier: null,
      } as never);

      const POST = await loadOrdersPost();
      const response = await POST(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ordersPostBody()),
        }),
      );

      expect(response.status).toBe(201);
      expect(mockTransaction).toHaveBeenCalled();
      const checkoutOrder = await import('@/lib/checkout-order');
      expect(checkoutOrder.executeCheckoutInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ customerId: 'guest' }),
        expect.anything(),
      );
      const body = await response.json();
      expect(body.guestToken).toBeTruthy();
    });

    it('WhatsApp sin whatsappOrderPhone configurado: 503 y transacción no llamada', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'whatsapp');
      mockGetServerSession.mockResolvedValue(null);
      mockReadSettings.mockResolvedValue({ storeName: 'MT', address: 'Av 1', whatsappOrderPhone: '' });

      const POST = await loadOrdersPost();
      const response = await POST(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ordersPostBody()),
        }),
      );

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.message).toBe('El canal de pedidos por WhatsApp está temporalmente indisponible.');
      expect(mockTransaction).not.toHaveBeenCalled();
      const checkoutOrder = await import('@/lib/checkout-order');
      expect(checkoutOrder.executeCheckoutInTransaction).not.toHaveBeenCalled();
    });

    it('WhatsApp con whatsappOrderPhone en formato local (inválido): 503 y transacción no llamada', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'whatsapp');
      mockGetServerSession.mockResolvedValue(null);
      mockReadSettings.mockResolvedValue({ storeName: 'MT', address: 'Av 1', whatsappOrderPhone: '04121471338' });

      const POST = await loadOrdersPost();
      const response = await POST(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ordersPostBody()),
        }),
      );

      expect(response.status).toBe(503);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('Full + sin sesión: 401 y prisma.$transaction no llamado', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'full');
      mockGetServerSession.mockResolvedValue(null);

      const POST = await loadOrdersPost();
      const response = await POST(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ordersPostBody()),
        }),
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toMatch(/iniciar sesión/i);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('Full + sesión: continúa y customerId deriva de session, ignora body.customerId', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'full');
      mockGetServerSession.mockResolvedValue(AUTH_SESSION);
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const checkoutOrder = await import('@/lib/checkout-order');
        vi.mocked(checkoutOrder.executeCheckoutInTransaction).mockResolvedValue({
          id: 'order-2',
          orderNumber: 43,
          customerId: 'user-abc',
          items: [],
          status: 'Pendiente',
          createdAt: new Date(),
        } as never);
        return fn({});
      });
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'order-2',
        orderNumber: 43,
        customerId: 'user-abc',
        customerEmail: 'cliente@test.com',
        customerName: 'Cliente',
        customerPhone: '04121234567',
        status: 'Pendiente',
        createdAt: new Date(),
        items: [],
        total: 100,
        exchangeRateUsdBs: 50,
        paymentMethod: 'Pago Móvil',
        paymentBank: null,
        paymentReference: 'REF1',
        shippingAddress: 'Retiro',
        shippingCity: 'Barquisimeto',
        shippingState: 'Lara',
        shippingZipCode: 'N/A',
        shippingCountry: 'VE',
        trackingCarrier: null,
      } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'cliente@test.com' } as never);
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      const POST = await loadOrdersPost();
      const response = await POST(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ordersPostBody({ customerId: 'attacker-id' })),
        }),
      );

      expect(response.status).toBe(201);
      const checkoutOrder = await import('@/lib/checkout-order');
      expect(checkoutOrder.executeCheckoutInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ customerId: 'user-abc' }),
        expect.anything(),
      );
    });
  });

  describe('POST /api/checkout/upload-session', () => {
    it('WhatsApp: 404', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'whatsapp');
      const POST = await loadUploadSessionPost();
      const response = await POST(new Request('http://localhost/api/checkout/upload-session', { method: 'POST' }));
      expect(response.status).toBe(404);
      expect(mockPaymentUploadCreate).not.toHaveBeenCalled();
    });

    it('Full guest: 401', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'full');
      mockGetServerSession.mockResolvedValue(null);
      const POST = await loadUploadSessionPost();
      const response = await POST(new Request('http://localhost/api/checkout/upload-session', { method: 'POST' }));
      expect(response.status).toBe(401);
      expect(mockPaymentUploadCreate).not.toHaveBeenCalled();
    });

    it('Full auth: 200 y PaymentUpload.userId=session id', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'full');
      mockGetServerSession.mockResolvedValue(AUTH_SESSION);
      const POST = await loadUploadSessionPost();
      const response = await POST(new Request('http://localhost/api/checkout/upload-session', { method: 'POST' }));
      expect(response.status).toBe(200);
      expect(mockPaymentUploadCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-abc' }),
        }),
      );
    });
  });

  describe('POST /api/checkout/upload-proof', () => {
    function proofRequest() {
      const formData = new FormData();
      formData.append(
        'file',
        new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'proof.jpg', { type: 'image/jpeg' }),
      );
      return new Request('http://localhost/api/checkout/upload-proof', {
        method: 'POST',
        headers: { 'x-checkout-upload-token': 'raw-token' },
        body: formData,
      });
    }

    it('WhatsApp: 404', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'whatsapp');
      const POST = await loadUploadProofPost();
      const response = await POST(proofRequest());
      expect(response.status).toBe(404);
    });

    it('Full guest: 401', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'full');
      mockGetServerSession.mockResolvedValue(null);
      const POST = await loadUploadProofPost();
      const response = await POST(proofRequest());
      expect(response.status).toBe(401);
    });
  });

  describe('success page token', () => {
    it('Full: token no renderiza pedido', async () => {
      vi.stubEnv('CHECKOUT_MODE', 'full');
      mockGetServerSession.mockResolvedValue(null);
      const { prisma } = await import('@/lib/prisma');
      const { default: SuccessPage } = await import('@/app/checkout/success/page');
      const result = await SuccessPage({
        searchParams: Promise.resolve({ token: 'guest-token-raw' }),
      });
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
  });
});
