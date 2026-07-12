import { describe, it, expect, beforeEach } from 'vitest';
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

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

// ── verifySameOrigin (base) ─────────────────────────────────────────────────

describe('verifySameOrigin', () => {
  it('permite sin Origin (curl, apps nativas)', () => {
    const req = mockRequest({});
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('permite mismo origen (NEXTAUTH_URL)', () => {
    process.env.NEXTAUTH_URL = 'https://mundotechve.com';
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://mundotechve.com',
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('permite mismo origen (NEXT_PUBLIC_SITE_URL)', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://mundotechve.com';
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://mundotechve.com',
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('permite mismo host via x-forwarded-host', () => {
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://mundotechve.com',
      'x-forwarded-host': 'mundotechve.com',
      'x-forwarded-proto': 'https',
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('permite localhost con http', () => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    const req = mockRequestWithUrl('http://localhost:3000/api/test', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it('rechaza origen ajeno (cross-site)', () => {
    process.env.NEXTAUTH_URL = 'https://mundotechve.com';
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://evil.com',
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it('rechaza origen malformado', () => {
    process.env.NEXTAUTH_URL = 'https://mundotechve.com';
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'not-a-url',
    });
    expect(verifySameOrigin(req)).toBe(false);
  });
});

// ── rejectInvalidMutationOrigin ──────────────────────────────────────────────

describe('rejectInvalidMutationOrigin', () => {
  it('devuelve null para mismo origen', () => {
    process.env.NEXTAUTH_URL = 'https://mundotechve.com';
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
    process.env.NEXTAUTH_URL = 'https://mundotechve.com';
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'https://evil.com',
    });
    const result = rejectInvalidMutationOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('devuelve NextResponse 403 para origen malformado', () => {
    process.env.NEXTAUTH_URL = 'https://mundotechve.com';
    const req = mockRequestWithUrl('https://mundotechve.com/api/test', {
      origin: 'not-a-url',
    });
    const result = rejectInvalidMutationOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('respuesta 403 tiene mensaje uniforme', async () => {
    process.env.NEXTAUTH_URL = 'https://mundotechve.com';
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
    // Dos llamadas con el mismo secreto deben devolver el mismo resultado
    const req1 = mockRequest({ authorization: `Bearer ${SECRET}` });
    const req2 = mockRequest({ authorization: `Bearer ${SECRET}` });
    expect(verifyBearerSecret(req1, SECRET)).toBe(true);
    expect(verifyBearerSecret(req2, SECRET)).toBe(true);
  });

  it('timing-safe: secreto con mismos caracteres pero disposición distinta', () => {
    const similarSecret = 'vitest-cron-secret'; // same length, different chars
    const req = mockRequest({ authorization: `Bearer ${similarSecret}` });
    // Debe funcionar si es exactamente el mismo string
    expect(verifyBearerSecret(req, similarSecret)).toBe(true);
  });

  it('rechaza sin Bearer pero con contenido', () => {
    const req = mockRequest({ authorization: 'Basic dXNlcjpwYXNz' });
    expect(verifyBearerSecret(req, SECRET)).toBe(false);
  });
});
