import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/admin-access-server', () => ({
  requirePermissionAction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/persist-exchange-rate', () => ({
  persistExchangeRate: vi.fn(),
}));

describe('configActions RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN con solo ORDERS no actualiza tasa', async () => {
    const { requirePermissionAction } = await import('@/lib/admin-access-server');
    vi.mocked(requirePermissionAction).mockRejectedValue(new Error('No autorizado.'));

    const { updateExchangeRate } = await import('@/app/actions/configActions');
    const result = await updateExchangeRate(40);
    expect(result.success).toBe(false);
    expect(result.message).toBe('No autorizado.');
  });

  it('ADMIN con FINANCIAL_SETTINGS sí actualiza tasa', async () => {
    const { requirePermissionAction } = await import('@/lib/admin-access-server');
    vi.mocked(requirePermissionAction).mockResolvedValue({
      userId: 'a1', role: 'ADMIN', isSuperAdmin: false, permissions: ['FINANCIAL_SETTINGS'],
    });

    const { updateExchangeRate } = await import('@/app/actions/configActions');
    const result = await updateExchangeRate(40);
    expect(result.success).toBe(true);
  });
});
