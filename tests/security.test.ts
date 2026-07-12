import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rejectInvalidMutationOrigin, verifyBearerSecret, verifySameOrigin } from '@/lib/security';

// ── Helpers ───────────────────────────────────────────────────────────────

function mockRequest(headers: Record<string, string>): Request {
  return new Request('https://mundotechve.com/api/test', {
    headers: new Headers(headers),
  });
}

function mockRequestWithUrl(url: string, headers: Record<string, string>): Request {
  return new Request(url, {
    headers: new Headers(headers),
  });
}

// ── verifySameOrigin (base) ─────────────────────────────────────────────────

describe('verifySameOrigin', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_URL', 'https://mundotechve.com');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mundotechve.com');
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('permite sin Origin (curl, apps nativas)', () => {
    const req = mockRequest({});
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('permite mismo origen (NEXTAUTH_URL)', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://mundotechve.com',
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('permite mismo origen (NEXT_PUBLIC_SITE_URL)', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://mundotechve.com',
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('rechaza origen ajeno (cross-site)', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://evil.com',
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it('rechaza origen malformado', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'not-a-url',
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it('no confía en x-forwarded-host para permitir un origen ajeno', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXTAUTH_URL', 'https://mundotechve.com');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mundotechve.com');
    const request = mockRequestWithUrl(
      'https://mundotechve.com/api/test',
      {
        origin: 'https://evil.example',
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'https',
        host: 'evil.example',
      },
    );
    expect(
      verifySameOrigin(request),
    ).toBe(false);
  });

  it('permite localhost derivado de request.url solo en desarrollo', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const request = mockRequestWithUrl(
      'http://localhost:3000/api/test',
      {
        origin: 'http://localhost:3000',
      },
    );
    expect(
      verifySameOrigin(request),
    ).toBe(true);
  });

  it('no permite localhost automáticamente en producción', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXTAUTH_URL', 'https://mundotechve.com');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mundotechve.com');
    const request = mockRequestWithUrl(
      'http://localhost:3000/api/test',
      {
        origin: 'http://localhost:3000',
      },
    );
    expect(
      verifySameOrigin(request),
    ).toBe(false);
  });
});

// ── rejectInvalidMutationOrigin ──────────────────────────────────────────────

describe('rejectInvalidMutationOrigin', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_URL', 'https://mundotechve.com');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mundotechve.com');
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('devuelve null para mismo origen', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://mundotechve.com',
    });
    expect(rejectInvalidMutationOrigin(req)).toBeNull();
  });

  it('devuelve null sin Origin (curl)', () => {
    const req = mockRequest({});
    expect(rejectInvalidMutationOrigin(req)).toBeNull();
  });

  it('devuelve NextResponse 403 para origen ajeno', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://evil.com',
    });
    const result = rejectInvalidMutationOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('devuelve NextResponse 403 para origen malformado', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'not-a-url',
    });
    const result = rejectInvalidMutationOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('respuesta 403 tiene mensaje uniforme', async () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://evil.com',
    });
    const result = rejectInvalidMutationOrigin(req)!;
    const body = await result.json();
    expect(body).toEqual({ error: 'Origen no permitido.' });
  });
});

// ── verifyBearerSecret ─────────────────────────────────────────────────────

describe('verifyBearerSecret', () => {
  const SECRET = 'vitest-cron-secret';

  it('acepta bearer correcto', () => {
    const req = mockRequest({ authorization: `Bearer ${SECRET}` });
    expect(verifyBearerSecret(req, SECRET)).toBe(true);
  });

  it('rechaza bearer incorrecto', () => {
    const req = mockRequest({ authorization: 'Bearer wrong-secret' });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });

  it('rechaza sin header authorization', () => {
    const req = mockRequest({});
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });

  it('rechaza header vacío', () => {
    const req = mockRequest({ authorization: '' });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });

  it('rechaza prefijo incorrecto (sin espacio)', () => {
    const req = mockRequest({ authorization: `Bearer${SECRET}` });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });

  it('rechaza prefijo en minúscula', () => {
    const req = mockRequest({ authorization: `bearer ${SECRET}` });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });

  it('rechaza token de longitud diferente', () => {
    const req = mockRequest({ authorization: 'Bearer short' });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });

  it('rechaza token más largo', () => {
    const req = mockRequest({ authorization: `Bearer ${SECRET}extra` });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });

  it('rechaza secreto esperado vacío', () => {
    const req = mockRequest({ authorization: 'Bearer anything' });
    expect(verifyBearerSecret(req, '')).toBe(false);
  });

  it('timing-safe: mismo secreto, mismos caracteres, mismo resultado', () => {
    const req1 = mockRequest({ authorization: `Bearer ${SECRET}` });
    const req2 = mockRequest({ authorization: `Bearer ${SECRET}` });
    expect(verifyBearerSecret(req1, SECRET)).toBe(true);
    expect(verifyBearerSecret(req2, SECRET)).toBe(true);
  });

  it('rechaza secreto diferente con la misma longitud', () => {
    const wrongSameLength = 'vitest-cron-secreu';
    expect(wrongSameLength).toHaveLength(
      SECRET.length,
    );
    const request = mockRequest({
      authorization: `Bearer ${wrongSameLength}`,
    });
    expect(
      verifyBearerSecret(
        request,
        SECRET,
      ),
    ).toBe(false);
  });

  it('rechaza expected vacío incluso con Bearer vacío', () => {
    const request = mockRequest({
      authorization: 'Bearer ',
    });
    expect(
      verifyBearerSecret(
        request,
        '',
      ),
    ).toBe(false);
  });

  it('rechaza sin Bearer pero con contenido', () => {
    const req = mockRequest({ authorization: 'Basic dXNlcjpwYXNz' });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });
});
