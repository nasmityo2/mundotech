import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

// Mock prisma antes de importar los handlers
vi.mock('@/lib/prisma', () => ({
  prisma: {
    appConfig: {
      findMany: vi.fn(),
    },
  },
}));

/** Helper para crear rows mock de AppConfig con el shape completo de Prisma. */
function mockAppConfigRow(key: string, value: string) {
  return { id: `mock-${key}`, key, value, updatedAt: new Date() };
}

// Mock safe-logger
vi.mock('@/lib/safe-logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

// Mock api-auth
vi.mock('@/lib/api-auth', () => ({
  requireAdmin: vi.fn(),
  requireAdminAction: vi.fn(),
}));

describe('GET /api/health', () => {
  let handler: typeof import('@/app/api/health/route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh module state
    handler = (await import('@/app/api/health/route')).GET;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve 200 + status ok con todos los campos booleanos', async () => {
    const now = new Date().toISOString();
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      mockAppConfigRow('bcv_last_success_at', now),
      mockAppConfigRow('backup_last_success_at', now),
      mockAppConfigRow('purge_temp_data_last_success_at', now),
    ]);

    const response = await handler();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      status: 'ok',
      db: 'ok',
      bcvStale: false,
      backupStale: false,
      purgeStale: false,
    });
  });

  it('devuelve 200 con bcvStale=true si bc versus stale', async () => {
    const staleDate = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(); // 50 h atrás
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      mockAppConfigRow('bcv_last_success_at', staleDate),
      mockAppConfigRow('backup_last_success_at', new Date().toISOString()),
      mockAppConfigRow('purge_temp_data_last_success_at', new Date().toISOString()),
    ]);

    const response = await handler();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.bcvStale).toBe(true);
    expect(body.backupStale).toBe(false);
    expect(body.purgeStale).toBe(false);
    expect(body.status).toBe('ok'); // Stale no tumba status
  });

  it('no cambia status a degraded por bcvStale (solo por DB down)', async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      mockAppConfigRow('bcv_last_success_at', '2000-01-01T00:00:00.000Z'),
    ]);

    const response = await handler();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
  });

  it('devuelve 503 si DB está caída (findMany lanza)', async () => {
    vi.mocked(prisma.appConfig.findMany).mockRejectedValue(new Error('Connection refused'));

    const response = await handler();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({
      status: 'degraded',
      db: 'down',
      bcvStale: true,
      backupStale: true,
      purgeStale: true,
    });
  });

  it('devuelve 503 si Prisma queda colgado (timeout real a 2s)', async () => {
    vi.useFakeTimers();
    vi.mocked(prisma.appConfig.findMany).mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof prisma.appConfig.findMany>,
    );

    let settled = false;
    const handlerPromise = handler().then((response) => {
      settled = true;
      return response;
    });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const response = await handlerPromise;

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({
      status: 'degraded',
      db: 'down',
      bcvStale: true,
      backupStale: true,
      purgeStale: true,
    });

    vi.useRealTimers();
  });

  it('limpia el timer cuando findMany resuelve antes del timeout', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([]);

    const response = await handler();

    expect(response.status).toBe(200);
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('no contiene timestamps, version, host, error ni propiedades prohibidas', async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      mockAppConfigRow('bcv_last_success_at', new Date().toISOString()),
    ]);

    const response = await handler();
    const body = await response.json();

    // Propiedades que NO deben estar presentes
    const prohibited = ['lastBcvSuccessAt', 'version', 'host', 'error', 'timestamp', 'uptime'];
    for (const key of prohibited) {
      expect(body).not.toHaveProperty(key);
    }

    // Solo las 5 propiedades del contrato
    expect(Object.keys(body)).toEqual(['status', 'db', 'bcvStale', 'backupStale', 'purgeStale']);
  });

  it('tiene Cache-Control: no-store, max-age=0', async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([]);

    const response = await handler();
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
  });

  it('maneja timestamps inválidos (valores no ISO) sin crashear', async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      mockAppConfigRow('bcv_last_success_at', 'not-a-date'),
    ]);

    const response = await handler();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.bcvStale).toBe(true);
  });

  it('maneja ausencia de todas las AppConfig keys (DB vacía)', async () => {
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([]);

    const response = await handler();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.bcvStale).toBe(true);
    expect(body.backupStale).toBe(true);
    expect(body.purgeStale).toBe(true);
    expect(body.status).toBe('ok');
  });
});

describe('GET /api/admin/operations-health', () => {
  let handler: typeof import('@/app/api/admin/operations-health/route').GET;
  let requireAdmin: typeof import('@/lib/api-auth').requireAdmin;

  beforeEach(async () => {
    vi.clearAllMocks();
    handler = (await import('@/app/api/admin/operations-health/route')).GET;
    requireAdmin = (await import('@/lib/api-auth')).requireAdmin;
  });

  it('devuelve 403 si no es ADMIN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 }) as never,
    });

    const response = await handler();
    expect(response.status).toBe(403);
  });

  it('devuelve 200 + timestamps ISO y estados si es ADMIN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    const now = new Date().toISOString();
    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      mockAppConfigRow('bcv_last_success_at', now),
      mockAppConfigRow('backup_last_success_at', now),
      mockAppConfigRow('purge_temp_data_last_success_at', now),
    ]);

    const response = await handler();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('bcv');
    expect(body.bcv).toHaveProperty('lastSuccessAt');
    expect(body.bcv).toHaveProperty('stale');
    expect(body.bcv.lastSuccessAt).toBe(now);
    expect(body.bcv.stale).toBe(false);

    expect(body).toHaveProperty('backup');
    expect(body.backup.lastSuccessAt).toBe(now);
    expect(body.backup.stale).toBe(false);

    expect(body).toHaveProperty('purge');
    expect(body.purge.lastSuccessAt).toBe(now);
    expect(body.purge.stale).toBe(false);
  });

  it('nunca expone credenciales, paths ni PII', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([
      mockAppConfigRow('bcv_last_success_at', new Date().toISOString()),
    ]);

    const response = await handler();
    const body = await response.json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/password|secret|key=|token|path|credencial/i);
  });

  it('tiene Cache-Control: no-store', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.appConfig.findMany).mockResolvedValue([]);

    const response = await handler();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('devuelve 500 si Prisma falla', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });

    vi.mocked(prisma.appConfig.findMany).mockRejectedValue(new Error('DB error'));

    const response = await handler();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  it('devuelve 500 si Prisma queda colgado (timeout a 2s)', async () => {
    vi.useFakeTimers();
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.appConfig.findMany).mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof prisma.appConfig.findMany>,
    );

    let settled = false;
    const handlerPromise = handler().then((response) => {
      settled = true;
      return response;
    });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const response = await handlerPromise;

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('error');

    vi.useRealTimers();
  });
});
