import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/safe-logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock('@/lib/bcv-rate', () => ({
  fetchBcvRate: vi.fn(),
}));

vi.mock('@/app/actions/configActions', () => ({
  getExchangeRate: vi.fn(),
}));

vi.mock('@/lib/persist-exchange-rate', () => ({
  persistExchangeRateWithBcvDate: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  verifyBearerSecret: vi.fn(),
}));

function makeRequest(authorized = true): Request {
  return new Request('http://localhost/api/cron/update-bcv-rate', {
    headers: { Authorization: authorized ? 'Bearer test-secret' : 'Bearer wrong' },
  });
}

describe('GET /api/cron/update-bcv-rate', () => {
  let handler: typeof import('@/app/api/cron/update-bcv-rate/route').GET;
  let fetchBcvRate: ReturnType<typeof vi.fn>;
  let getExchangeRate: ReturnType<typeof vi.fn>;
  let persistExchangeRateWithBcvDate: ReturnType<typeof vi.fn>;
  let verifyBearerSecret: ReturnType<typeof vi.fn>;
  let prismaFindUnique: ReturnType<typeof vi.fn>;
  let prismaUpsert: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';

    const bcvRateMod = await import('@/lib/bcv-rate');
    fetchBcvRate = bcvRateMod.fetchBcvRate as ReturnType<typeof vi.fn>;

    const configMod = await import('@/app/actions/configActions');
    getExchangeRate = configMod.getExchangeRate as ReturnType<typeof vi.fn>;

    const persistMod = await import('@/lib/persist-exchange-rate');
    persistExchangeRateWithBcvDate = persistMod.persistExchangeRateWithBcvDate as ReturnType<typeof vi.fn>;

    const secMod = await import('@/lib/security');
    verifyBearerSecret = secMod.verifyBearerSecret as ReturnType<typeof vi.fn>;

    const prismaMod = await import('@/lib/prisma');
    prismaFindUnique = prismaMod.prisma.appConfig.findUnique as ReturnType<typeof vi.fn>;
    prismaUpsert = prismaMod.prisma.appConfig.upsert as ReturnType<typeof vi.fn>;

    handler = (await import('@/app/api/cron/update-bcv-rate/route')).GET;
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.CRON_SECRET;
  });

  it('sin auth devuelve 401', async () => {
    verifyBearerSecret.mockReturnValue(false);
    const res = await handler(makeRequest(false));
    expect(res.status).toBe(401);
    expect(persistExchangeRateWithBcvDate).not.toHaveBeenCalled();
  });

  it('fetchBcvRate devuelve null → 503 con reason=fetch-failed', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue(null);
    const res = await handler(makeRequest());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, reason: 'fetch-failed' });
    expect(persistExchangeRateWithBcvDate).not.toHaveBeenCalled();
  });

  it('misma fecha → 200 y sinCambios=true', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue({ rate: 723.999, date: '2026-07-14T00:00:00-04:00' });
    prismaFindUnique.mockResolvedValue({ value: '2026-07-14T00:00:00-04:00' });
    prismaUpsert.mockResolvedValue({});
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, sinCambios: true });
    expect(persistExchangeRateWithBcvDate).not.toHaveBeenCalled();
  });

  it('salto superior a 15% → 409 y needsReview=true', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue({ rate: 900, date: '2026-07-15T00:00:00-04:00' });
    prismaFindUnique.mockResolvedValue({ value: '2026-07-14T00:00:00-04:00' });
    getExchangeRate.mockResolvedValue(700);
    const res = await handler(makeRequest());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, needsReview: true });
    expect(persistExchangeRateWithBcvDate).not.toHaveBeenCalled();
  });

  it('actualización válida → 200 con rate y date', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue({ rate: 725, date: '2026-07-15T00:00:00-04:00' });
    prismaFindUnique.mockResolvedValue({ value: '2026-07-14T00:00:00-04:00' });
    getExchangeRate.mockResolvedValue(723.999);
    persistExchangeRateWithBcvDate.mockResolvedValue(undefined);
    prismaUpsert.mockResolvedValue({});
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, rate: 725 });
    expect(persistExchangeRateWithBcvDate).toHaveBeenCalledWith(725, '2026-07-15T00:00:00-04:00');
  });

  it('excepción inesperada → 500', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockRejectedValue(new Error('unexpected'));
    const res = await handler(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false });
    expect(persistExchangeRateWithBcvDate).not.toHaveBeenCalled();
  });

  it('en fetch-failed no llama persistExchangeRateWithBcvDate', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue(null);
    await handler(makeRequest());
    expect(persistExchangeRateWithBcvDate).not.toHaveBeenCalled();
  });

  it('en salto sospechoso no llama persistExchangeRateWithBcvDate', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue({ rate: 999, date: '2026-07-15T00:00:00-04:00' });
    prismaFindUnique.mockResolvedValue({ value: '2026-07-14T00:00:00-04:00' });
    getExchangeRate.mockResolvedValue(723.999);
    await handler(makeRequest());
    expect(persistExchangeRateWithBcvDate).not.toHaveBeenCalled();
  });

  it('solo corrida exitosa registra bcv_last_success_at vía upsert', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue({ rate: 725, date: '2026-07-15T00:00:00-04:00' });
    prismaFindUnique.mockResolvedValue({ value: '2026-07-14T00:00:00-04:00' });
    getExchangeRate.mockResolvedValue(723.999);
    persistExchangeRateWithBcvDate.mockResolvedValue(undefined);
    prismaUpsert.mockResolvedValue({});
    await handler(makeRequest());
    expect(prismaUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'bcv_last_success_at' } }),
    );
  });

  it('fetch-failed no registra bcv_last_success_at', async () => {
    verifyBearerSecret.mockReturnValue(true);
    fetchBcvRate.mockResolvedValue(null);
    await handler(makeRequest());
    expect(prismaUpsert).not.toHaveBeenCalled();
  });
});
