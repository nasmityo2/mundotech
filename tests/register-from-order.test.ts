import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

const GENERIC_FAILURE =
  'No pudimos crear la cuenta desde este pedido. Verifica el enlace o solicita uno nuevo.';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

const {
  mockOrderFindFirst,
  mockUserFindUnique,
  mockTransaction,
  mockRateLimitCritical,
  mockGetActionClientIp,
  mockBcryptHash,
  mockSendWelcomeEmail,
  mockLogInfo,
  mockLogError,
  mockTx,
} = vi.hoisted(() => {
  const tx = {
    order: { updateMany: vi.fn() },
    user: { create: vi.fn() },
  };
  return {
    mockOrderFindFirst: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockTransaction: vi.fn(),
    mockRateLimitCritical: vi.fn(),
    mockGetActionClientIp: vi.fn(),
    mockBcryptHash: vi.fn(),
    mockSendWelcomeEmail: vi.fn(),
    mockLogInfo: vi.fn(),
    mockLogError: vi.fn(),
    mockTx: tx,
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findFirst: mockOrderFindFirst },
    user: { findUnique: mockUserFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimitCritical: mockRateLimitCritical,
  hashForBucket: (value: string) => `bucket-${value}`,
}));

vi.mock('@/lib/security', () => ({
  getActionClientIp: mockGetActionClientIp,
  hashToken: (raw: string) => createHash('sha256').update(raw).digest('hex'),
}));

vi.mock('bcrypt', () => ({
  default: { hash: mockBcryptHash },
}));

vi.mock('@/lib/resend', () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@/lib/safe-logger', () => ({
  logInfo: mockLogInfo,
  logError: mockLogError,
}));

function resetMocks(): void {
  vi.clearAllMocks();
  mockGetActionClientIp.mockResolvedValue('203.0.113.10');
  mockRateLimitCritical.mockResolvedValue({ limited: false });
  mockBcryptHash.mockResolvedValue('hashed-password');
  mockSendWelcomeEmail.mockResolvedValue(undefined);
  mockTx.order.updateMany.mockReset();
  mockTx.user.create.mockReset();
}

describe('registerFromOrderAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));
    resetMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMocks();
  });

  async function loadAction() {
    const mod = await import('@/app/actions/authActions');
    return mod.registerFromOrderAction;
  }

  it('crea cuenta y vincula pedidos con token guest válido', async () => {
    const guestToken = 'raw-guest-token-valid-abc';
    const tokenHash = hashToken(guestToken);

    mockOrderFindFirst.mockResolvedValue({
      id: 'order-1',
      customerEmail: 'Cliente@mail.com',
      customerName: 'Cliente Test',
    });
    mockUserFindUnique.mockResolvedValue(null);
    mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));
    mockTx.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 2 });
    mockTx.user.create.mockResolvedValue({ id: 'user-1' });

    const registerFromOrderAction = await loadAction();
    const result = await registerFromOrderAction(guestToken, 'password123');

    expect(result).toEqual({
      success: true,
      message: '¡Cuenta creada! Tus pedidos ya están vinculados.',
      email: 'cliente@mail.com',
    });
    expect(mockOrderFindFirst).toHaveBeenCalledWith({
      where: {
        guestAccessTokenHash: tokenHash,
        guestAccessTokenExpiresAt: { gt: new Date('2026-07-12T12:00:00.000Z') },
        customerId: null,
      },
      select: { id: true, customerEmail: true, customerName: true },
    });
    expect(mockTx.order.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        guestAccessTokenHash: tokenHash,
        guestAccessTokenExpiresAt: { gt: new Date('2026-07-12T12:00:00.000Z') },
        customerId: null,
      },
      data: {
        guestAccessTokenHash: null,
        guestAccessTokenExpiresAt: null,
      },
    });
    expect(mockTx.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Cliente Test',
        email: 'cliente@mail.com',
        password: 'hashed-password',
        role: 'CLIENT',
      },
      select: { id: true },
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith('cliente@mail.com', 'Cliente');
    expect(mockLogInfo).toHaveBeenCalledWith('register_from_order_success', {
      operation: 'register_from_order',
    });
    expect(JSON.stringify(mockLogInfo.mock.calls)).not.toContain(guestToken);
  });

  it('rechaza token inválido, expirado y ya usado con el mismo mensaje genérico', async () => {
    const registerFromOrderAction = await loadAction();

    mockOrderFindFirst.mockResolvedValue(null);
    const invalid = await registerFromOrderAction('token-invalido', 'password123');
    expect(invalid).toEqual({ success: false, message: GENERIC_FAILURE });

    mockOrderFindFirst.mockResolvedValue({
      id: 'order-expired',
      customerEmail: 'exp@test.com',
      customerName: 'Exp',
    });
    mockUserFindUnique.mockResolvedValue({ id: 'existing' });
    const used = await registerFromOrderAction('token-usado', 'password123');
    expect(used).toEqual({ success: false, message: GENERIC_FAILURE });

    mockOrderFindFirst.mockResolvedValue({
      id: 'order-race',
      customerEmail: 'race@test.com',
      customerName: 'Race',
    });
    mockUserFindUnique.mockResolvedValue(null);
    mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));
    mockTx.order.updateMany.mockResolvedValueOnce({ count: 0 });
    const race = await registerFromOrderAction('token-carrera', 'password123');
    expect(race).toEqual({ success: false, message: GENERIC_FAILURE });

    expect(invalid.message).toBe(used.message);
    expect(used.message).toBe(race.message);
  });

  it('no permite crear cuenta solo con orderId (sin token guest)', async () => {
    const registerFromOrderAction = await loadAction();
    mockOrderFindFirst.mockResolvedValue(null);

    const result = await registerFromOrderAction('cmorderid123456789', 'password123');

    expect(result).toEqual({ success: false, message: GENERIC_FAILURE });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('carrera doble: solo una transacción consume el token (count=1)', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-1',
      customerEmail: 'race@test.com',
      customerName: 'Race',
    });
    mockUserFindUnique.mockResolvedValue(null);
    mockTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));
    mockTx.order.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.user.create.mockResolvedValue({ id: 'user-1' });
    mockTx.order.updateMany.mockResolvedValue({ count: 1 });

    const registerFromOrderAction = await loadAction();
    const ok = await registerFromOrderAction('token-unico', 'password123');
    expect(ok.success).toBe(true);

    mockTx.order.updateMany.mockReset();
    mockTx.order.updateMany.mockResolvedValueOnce({ count: 0 });
    const second = await registerFromOrderAction('token-unico', 'password456');
    expect(second).toEqual({ success: false, message: GENERIC_FAILURE });
  });

  it('exige contraseña de al menos 8 caracteres', async () => {
    const registerFromOrderAction = await loadAction();
    const result = await registerFromOrderAction('token-valido', 'short');
    expect(result).toEqual({
      success: false,
      message: 'La contraseña debe tener al menos 8 caracteres.',
    });
    expect(mockOrderFindFirst).not.toHaveBeenCalled();
  });
});
