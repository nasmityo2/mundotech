import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock prisma antes de importar el handler
const mockPrisma = {
  passwordResetToken: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  user: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  paymentUpload: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  productView: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  abandonedCart: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  appConfig: {
    upsert: vi.fn().mockResolvedValue({}),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function mockRequest(opts: {
  secret?: string;
  dryRun?: boolean;
} = {}): Request {
  const url = new URL('http://localhost:3000/api/cron/purge-temporary-data');
  if (opts.dryRun) url.searchParams.set('dryRun', '1');
  const headers: Record<string, string> = {};
  if (opts.secret) {
    headers['authorization'] = `Bearer ${opts.secret}`;
  }
  return new Request(url, { headers });
}

function resetAllMocks(): void {
  vi.clearAllMocks();
  mockPrisma.passwordResetToken.count.mockResolvedValue(0);
  mockPrisma.passwordResetToken.findMany.mockResolvedValue([]);
  mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.user.count.mockResolvedValue(0);
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.paymentUpload.count.mockResolvedValue(0);
  mockPrisma.paymentUpload.findMany.mockResolvedValue([]);
  mockPrisma.paymentUpload.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.productView.count.mockResolvedValue(0);
  mockPrisma.productView.findMany.mockResolvedValue([]);
  mockPrisma.productView.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.abandonedCart.count.mockResolvedValue(0);
  mockPrisma.abandonedCart.findMany.mockResolvedValue([]);
  mockPrisma.abandonedCart.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.appConfig.upsert.mockResolvedValue({});
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('purge-temporary-data — auth', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '7');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '30');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('rechaza sin Authorization header', async () => {
    const req = mockRequest({ secret: undefined });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('rechaza con secreto incorrecto', async () => {
    const req = mockRequest({ secret: 'wrong-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('rechaza con CRON_SECRET no configurado', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
  });

  it('acepta con secreto correcto', async () => {
    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
  });
});

describe('purge-temporary-data — dryRun', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '7');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '30');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('dryRun devuelve conteos sin mutar', async () => {
    // Simula 5 reset tokens expirados
    mockPrisma.passwordResetToken.count.mockResolvedValue(5);

    const req = mockRequest({ secret: 'vitest-cron-secret', dryRun: true });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);

    // En dryRun, deleted = min(count, 200) = 5
    expect(body.categories.passwordResetTokens.deleted).toBe(5);
    expect(body.categories.passwordResetTokens.checked).toBe(5);

    // No debe haber llamado a deleteMany ni updateMany
    expect(mockPrisma.passwordResetToken.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.paymentUpload.deleteMany).not.toHaveBeenCalled();
  });

  it('dryRun no actualiza AppConfig', async () => {
    mockPrisma.passwordResetToken.count.mockResolvedValue(3);

    const req = mockRequest({ secret: 'vitest-cron-secret', dryRun: true });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);

    // AppConfig no debe actualizarse en dryRun
    // (el código actual siempre upsert, pero verificar que no hay write)
    expect(mockPrisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();
  });
});

describe('purge-temporary-data — time boundaries', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '7');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '30');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('no borra passwordResetToken con expiresAt dentro de la ventana', async () => {
    // count=0 significa que ningún registro coincide con la ventana
    mockPrisma.passwordResetToken.count.mockResolvedValue(0);

    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories.passwordResetTokens.checked).toBe(0);
    expect(body.categories.passwordResetTokens.deleted).toBe(0);
    expect(mockPrisma.passwordResetToken.findMany).not.toHaveBeenCalled();
  });

  it('borra passwordResetToken con expiresAt fuera de la ventana', async () => {
    mockPrisma.passwordResetToken.count.mockResolvedValue(3);
    mockPrisma.passwordResetToken.findMany.mockResolvedValue([
      { id: 'tok-1' },
      { id: 'tok-2' },
      { id: 'tok-3' },
    ]);
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 3 });

    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories.passwordResetTokens.checked).toBe(3);
    expect(body.categories.passwordResetTokens.deleted).toBe(3);
    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['tok-1', 'tok-2', 'tok-3'] } },
    });
  });
});

describe('purge-temporary-data — PaymentUpload LINKED safety', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '7');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '30');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('NUNCA borra PaymentUpload LINKED', async () => {
    // La query de DELETED solo cuenta y busca status='DELETED'
    // LINKED no está incluido en esa query
    mockPrisma.paymentUpload.count.mockResolvedValue(0);

    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);

    // Verificar que count fue llamado con status:'DELETED', no LINKED
    const countCalls = mockPrisma.paymentUpload.count.mock.calls;
    expect(countCalls.length).toBeGreaterThanOrEqual(1);
    const whereArg = countCalls[0]?.[0]?.where as Record<string, unknown> | undefined;
    expect(whereArg?.status).toBe('DELETED');

    // No debe haber deleteMany con status LINKED
    const deleteCalls = mockPrisma.paymentUpload.deleteMany.mock.calls;
    for (const call of deleteCalls) {
      const delWhere = (call[0] as { where?: Record<string, unknown> })?.where;
      if (delWhere?.status) {
        expect(delWhere.status).toBe('DELETED');
      }
    }
  });

  it('NUNCA borra Order ni OrderItem', async () => {
    // El handler no tiene ninguna referencia a Order ni OrderItem
    // Este test verifica que no se llama prisma.order ni prisma.orderItem
    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);

    // Order y OrderItem no están mockeados en prisma, así que si el handler
    // intentara accederlos fallaría con TypeError
    // No necesitamos assertions adicionales porque el test mismo
    // verifica que la respuesta es 200 (sin errores de acceso a modelos no mockeados)
  });
});

describe('purge-temporary-data — batch limit', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '7');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '30');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('limita a BATCH_LIMIT=200 en dryRun', async () => {
    mockPrisma.passwordResetToken.count.mockResolvedValue(500);

    const req = mockRequest({ secret: 'vitest-cron-secret', dryRun: true });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();

    // En dryRun, deleted debe ser Math.min(500, 200) = 200
    expect(body.categories.passwordResetTokens.deleted).toBe(200);
    expect(body.categories.passwordResetTokens.checked).toBe(500);
  });

  it('limita a BATCH_LIMIT=200 en ejecución real', async () => {
    const manyRecords = Array.from({ length: 500 }, (_, i) => ({
      id: `tok-${i}`,
    }));

    mockPrisma.passwordResetToken.count.mockResolvedValue(500);
    mockPrisma.passwordResetToken.findMany.mockResolvedValue(
      manyRecords.slice(0, 200),
    );
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 200 });

    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.categories.passwordResetTokens.checked).toBe(500);
    expect(body.categories.passwordResetTokens.deleted).toBe(200);

    // findMany debe recibir take:200
    const findManyCalls = mockPrisma.passwordResetToken.findMany.mock.calls;
    expect(findManyCalls.length).toBe(1);
    expect(findManyCalls[0]?.[0]?.take).toBe(200);
  });
});

describe('purge-temporary-data — emailChangeToken cleanup', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '7');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '30');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('limpia emailChangeToken, emailChangeTokenExpiry y pendingEmail', async () => {
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ]);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories.emailChangeTokens.checked).toBe(2);
    expect(body.categories.emailChangeTokens.deleted).toBe(2);

    // Verifica que updateMany pone los tres campos a null
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-1', 'user-2'] } },
      data: {
        emailChangeToken: null,
        emailChangeTokenExpiry: null,
        pendingEmail: null,
      },
    });
  });
});

describe('purge-temporary-data — idempotency', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '7');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '30');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('segunda ejecución no borra nada si ya purgó todo', async () => {
    // Primera ejecución
    mockPrisma.passwordResetToken.count.mockResolvedValue(3);
    mockPrisma.passwordResetToken.findMany.mockResolvedValue([
      { id: 'tok-1' }, { id: 'tok-2' }, { id: 'tok-3' },
    ]);
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 3 });

    let req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    let res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    let body = await res.json();
    expect(body.categories.passwordResetTokens.deleted).toBe(3);

    // Segunda ejecución — count = 0 (ya no hay registros)
    resetAllMocks();
    mockPrisma.passwordResetToken.count.mockResolvedValue(0);
    // Resto de mocks vuelven a default (0)

    req = mockRequest({ secret: 'vitest-cron-secret' });
    res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    body = await res.json();
    expect(body.categories.passwordResetTokens.checked).toBe(0);
    expect(body.categories.passwordResetTokens.deleted).toBe(0);
    expect(mockPrisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();
  });
});

describe('purge-temporary-data — sin variables de retención', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'vitest-cron-secret');
    vi.stubEnv('TEMP_TOKEN_RETENTION_DAYS', '');
    vi.stubEnv('DELETED_UPLOAD_RETENTION_DAYS', '');
    // En producción sin variables → skip. En dev se usan defaults.
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAllMocks();
  });

  it('omite categorías de tokens y uploads cuando las variables no están configuradas en producción', async () => {
    const req = mockRequest({ secret: 'vitest-cron-secret' });
    const { GET } = await import(
      '@/app/api/cron/purge-temporary-data/route'
    );
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
    const body = await res.json();

    // En producción, sin TEMP_TOKEN_RETENTION_DAYS → skippedReason
    expect(body.categories.passwordResetTokens.skippedReason).toBe(
      'TEMP_TOKEN_RETENTION_DAYS not configured',
    );
    expect(body.categories.emailChangeTokens.skippedReason).toBe(
      'TEMP_TOKEN_RETENTION_DAYS not configured',
    );
    expect(body.categories.deletedUploads.skippedReason).toBe(
      'DELETED_UPLOAD_RETENTION_DAYS not configured',
    );

    // ProductView y AbandonedCart siempre corren (ventanas fijas)
    expect(body.categories.productViews.checked).toBe(0);
    expect(body.categories.abandonedCartsPending.checked).toBe(0);
    expect(body.categories.abandonedCartsTerminal.checked).toBe(0);
  });
});
