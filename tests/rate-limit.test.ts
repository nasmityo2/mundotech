import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  memoryWindow,
  getClientIp,
  hashForBucket,
  rateLimitCritical,
  rateLimitBestEffort,
  rateLimit,
  __memoryStoreClear,
  __memoryClearByPrefix,
} from '@/lib/rate-limit';
import { buildRateLimitedResponse } from '@/lib/security';

// ── Helpers ───────────────────────────────────────────────────────────────

function mockRequest(headers: Record<string, string>): Request {
  return new Request('https://mundotechve.com/api/test', {
    headers: new Headers(headers),
  });
}

// ── Cleanup global ─────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
  __memoryStoreClear();
});

// ── getClientIp ────────────────────────────────────────────────────────────

describe('getClientIp', () => {
  describe('cloudflare', () => {
    beforeEach(() => {
      vi.stubEnv('DEPLOYMENT_ENV', 'cloudflare');
    });

    it('acepta cf-connecting-ip válido', () => {
      const req = mockRequest({ 'cf-connecting-ip': '1.2.3.4' });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('acepta IPv6 cf-connecting-ip', () => {
      const req = mockRequest({ 'cf-connecting-ip': '::1' });
      expect(getClientIp(req)).toBe('::1');
    });

    it('rechaza cf-connecting-ip no-IP y devuelve unknown', () => {
      const req = mockRequest({ 'cf-connecting-ip': 'not-an-ip' });
      expect(getClientIp(req)).toBe('unknown');
    });

    it('devuelve unknown si cf-connecting-ip ausente', () => {
      const req = mockRequest({ 'x-forwarded-for': '1.2.3.4' });
      expect(getClientIp(req)).toBe('unknown');
    });

    it('rechaza cf-connecting-ip vacío', () => {
      const req = mockRequest({ 'cf-connecting-ip': '  ' });
      expect(getClientIp(req)).toBe('unknown');
    });

    it('NO cae a XFF si cf-connecting-ip es inválido', () => {
      const req = mockRequest({
        'cf-connecting-ip': 'not-ip',
        'x-forwarded-for': '10.0.0.1, 1.2.3.4',
      });
      expect(getClientIp(req)).toBe('unknown');
    });
  });

  describe('vercel', () => {
    beforeEach(() => {
      vi.stubEnv('DEPLOYMENT_ENV', 'vercel');
    });

    it('acepta primer x-vercel-forwarded-for', () => {
      const req = mockRequest({ 'x-vercel-forwarded-for': '4.5.6.7, 8.9.10.11' });
      expect(getClientIp(req)).toBe('4.5.6.7');
    });

    it('rechaza x-vercel-forwarded-for no-IP', () => {
      const req = mockRequest({ 'x-vercel-forwarded-for': 'garbage' });
      expect(getClientIp(req)).toBe('unknown');
    });

    it('devuelve unknown si x-vercel-forwarded-for ausente', () => {
      const req = mockRequest({ 'x-forwarded-for': '1.2.3.4' });
      expect(getClientIp(req)).toBe('unknown');
    });
  });

  describe('desarrollo (sin DEPLOYMENT_ENV)', () => {
    it('toma último XFF si es IP válida', () => {
      const req = mockRequest({
        'x-forwarded-for': 'evil.1, 1.2.3.4',
      });
      expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('cae a x-real-ip si XFF es inválido', () => {
      const req = mockRequest({
        'x-forwarded-for': 'not-ip',
        'x-real-ip': '9.9.9.9',
      });
      expect(getClientIp(req)).toBe('9.9.9.9');
    });

    it('devuelve unknown si todo ausente', () => {
      const req = mockRequest({});
      expect(getClientIp(req)).toBe('unknown');
    });
  });
});

// ── hashForBucket ──────────────────────────────────────────────────────────

describe('hashForBucket', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('produce hash determinista', () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'vitest-nextauth-secret-for-rate-limit');
    const a = hashForBucket('1.2.3.4');
    const b = hashForBucket('1.2.3.4');
    expect(a).toBe(b);
  });

  it('diferentes entradas producen diferentes hashes', () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'vitest-nextauth-secret-for-rate-limit');
    const a = hashForBucket('1.2.3.4');
    const b = hashForBucket('5.6.7.8');
    expect(a).not.toBe(b);
  });

  it('normaliza a minúsculas', () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'vitest-nextauth-secret-for-rate-limit');
    const a = hashForBucket('USER@MAIL.COM');
    const b = hashForBucket('user@mail.com');
    expect(a).toBe(b);
  });

  it('nunca expone el valor original', () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'vitest-nextauth-secret-for-rate-limit');
    const result = hashForBucket('1.2.3.4');
    expect(result).not.toContain('1.2.3.4');
  });

  describe('hashForBucket sin NEXTAUTH_SECRET', () => {
    it('lanza en vez de usar un fallback predecible', () => {
      vi.stubEnv('NEXTAUTH_SECRET', '');
      expect(() =>
        hashForBucket('1.2.3.4'),
      ).toThrow('NEXTAUTH_SECRET');
    });
  });
});

// ── memoryWindow ────────────────────────────────────────────────────────────

describe('memoryWindow', () => {

  it('permite hasta el límite y bloquea al exceder', () => {
    const config = { limit: 3, windowMs: 60_000 };

    expect(memoryWindow('test', config)).toEqual({ limited: false, retryAfterSeconds: 0 });
    expect(memoryWindow('test', config)).toEqual({ limited: false, retryAfterSeconds: 0 });
    expect(memoryWindow('test', config)).toEqual({ limited: false, retryAfterSeconds: 0 });
    const blocked = memoryWindow('test', config);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('aisla buckets diferentes', () => {
    const config = { limit: 1, windowMs: 60_000 };

    expect(memoryWindow('bucket-a', config).limited).toBe(false);
    expect(memoryWindow('bucket-b', config).limited).toBe(false);
    // bucket-a llegó al límite, bucket-b no
    expect(memoryWindow('bucket-a', config).limited).toBe(true);
    expect(memoryWindow('bucket-b', config).limited).toBe(true);
  });

  it('reinicia contador tras vencer la ventana (fake timers)', () => {
    vi.useFakeTimers();
    const config = { limit: 1, windowMs: 100 };

    expect(memoryWindow('sliding', config).limited).toBe(false);
    // Segundo request bloqueado
    expect(memoryWindow('sliding', config).limited).toBe(true);

    vi.advanceTimersByTime(101);
    // Ventana vencida — se reinicia
    expect(memoryWindow('sliding', config).limited).toBe(false);
  });

  it('retryAfterSeconds es conservador', () => {
    const config = { limit: 1, windowMs: 60_000 };

    memoryWindow('retry', config);
    const blocked = memoryWindow('retry', config);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});

// ── rateLimitCritical ──────────────────────────────────────────────────────

describe('rateLimitCritical', () => {

  it('usa memoria como fallback cuando no hay Upstash configurado', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const result1 = await rateLimitCritical('critical-test', { limit: 1, windowMs: 60_000 });
    expect(result1.limited).toBe(false);
    expect(result1.source).toBe('memory');

    const result2 = await rateLimitCritical('critical-test', { limit: 1, windowMs: 60_000 });
    expect(result2.limited).toBe(true);
    expect(result2.source).toBe('memory');
  });

  it('nunca hace fail-open — memory usa mismo límite', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const config = { limit: 2, windowMs: 60_000 };
    await rateLimitCritical('failopen', config);
    await rateLimitCritical('failopen', config);
    const result = await rateLimitCritical('failopen', config);
    expect(result.limited).toBe(true);
  });

  it('aislamiento por bucket en critical', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const config = { limit: 1, windowMs: 60_000 };

    await rateLimitCritical('critical-a', config);
    const result = await rateLimitCritical('critical-b', config);
    expect(result.limited).toBe(false);
  });
});

// ── rateLimitBestEffort ────────────────────────────────────────────────────

describe('rateLimitBestEffort', () => {

  it('usa memoria como fallback', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const result = await rateLimitBestEffort('be-test', { limit: 1, windowMs: 60_000 });
    expect(result.source).toBe('memory');
    expect(result.limited).toBe(false);
  });
});

// ── rateLimit (deprecated wrapper) ─────────────────────────────────────────

describe('rateLimit (deprecated)', () => {

  it('devuelve booleano (compatibilidad)', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');

    const ok = await rateLimit('old-api', { limit: 1, windowMs: 60_000 });
    expect(ok).toBe(false);

    const blocked = await rateLimit('old-api', { limit: 1, windowMs: 60_000 });
    expect(blocked).toBe(true);
  });
});

// ── Upstash simulado ───────────────────────────────────────────────────────

describe('Upstash fallback scenarios', () => {

  it('cae a memoria si Upstash devuelve 500', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await rateLimitCritical('upstash-500', { limit: 2, windowMs: 60_000 });
    expect(result.source).toBe('memory');
    expect(result.limited).toBe(false);
  });

  it('cae a memoria si Upstash timeout', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));

    const result = await rateLimitCritical('upstash-timeout', { limit: 2, windowMs: 60_000 });
    expect(result.source).toBe('memory');
    expect(result.limited).toBe(false);
  });

  it('cae a memoria si Upstash devuelve respuesta malformada', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([{ result: 'not-a-number' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await rateLimitCritical('upstash-malformed', { limit: 2, windowMs: 60_000 });
    expect(result.source).toBe('memory');
    expect(result.limited).toBe(false);
  });

  it('usa Upstash correctamente cuando responde bien', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    // Simula 2 requests bajo límite de 5
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 1 }, { result: 'OK' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ result: 2 }, { result: 'OK' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const r1 = await rateLimitCritical('upstash-ok', { limit: 5, windowMs: 60_000 });
    expect(r1.source).toBe('upstash');
    expect(r1.limited).toBe(false);

    const r2 = await rateLimitCritical('upstash-ok', { limit: 5, windowMs: 60_000 });
    expect(r2.source).toBe('upstash');
    expect(r2.limited).toBe(false);
  });

  it('detecta límite superado en Upstash', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([{ result: 6 }, { result: 'OK' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await rateLimitCritical('upstash-over', { limit: 5, windowMs: 60_000 });
    expect(result.source).toBe('upstash');
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});

// ── buildRateLimitedResponse ────────────────────────────────────────────────

describe('buildRateLimitedResponse', () => {
  it('incluye status, Retry-After y no-store', async () => {
    const response = buildRateLimitedResponse(42);
    expect(response.status).toBe(429);
    expect(
      response.headers.get('Retry-After'),
    ).toBe('42');
    expect(
      response.headers.get('Cache-Control'),
    ).toBe('no-store');
    const body = await response.json();
    expect(body).toEqual({
      message:
        'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.',
    });
  });

  it('usa mínimo un segundo', () => {
    const response = buildRateLimitedResponse(0);
    expect(
      response.headers.get('Retry-After'),
    ).toBe('1');
  });

  it('acepta mensaje genérico personalizado sin exponer backend', async () => {
    const response = buildRateLimitedResponse(
      10,
      'Espera unos segundos e intenta de nuevo.',
    );
    const body = await response.json();
    expect(body).toEqual({
      message:
        'Espera unos segundos e intenta de nuevo.',
    });
    expect(JSON.stringify(body)).not.toContain('upstash');
    expect(JSON.stringify(body)).not.toContain('memory');
  });
});

// ── Limpieza de Map ────────────────────────────────────────────────────────

describe('memory cleanup', () => {

  it('limpia entradas expiradas después del intervalo (fake timers)', () => {
    vi.useFakeTimers();
    const config = { limit: 1, windowMs: 50 };

    memoryWindow('cleanup-test', config);
    // Forzar que la ventana expire
    vi.advanceTimersByTime(51);

    // Una nueva entrada con window corta
    memoryWindow('cleanup-test', { limit: 1, windowMs: 50 });
    // El contador debería haberse reiniciado (primer request de ventana nueva)
    expect(memoryWindow('cleanup-test', { limit: 1, windowMs: 50 }).limited).toBe(true);
  });

  it('__memoryClearByPrefix limpia solo entradas con prefijo', () => {
    const config = { limit: 1, windowMs: 60_000 };

    memoryWindow('auth:123', config);
    memoryWindow('orders:456', config);

    __memoryClearByPrefix('auth:');

    // auth debe haberse reiniciado
    expect(memoryWindow('auth:123', config).limited).toBe(false);
    // orders sigue bloqueado
    expect(memoryWindow('orders:456', config).limited).toBe(true);
  });
});
