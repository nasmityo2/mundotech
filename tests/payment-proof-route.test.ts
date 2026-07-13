import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/r2', () => ({
  getPrivateProofReadUrl: vi.fn(),
  isR2PublicUrl: vi.fn(),
}));

vi.mock('@/lib/safe-logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}));

const SIGNED_URL =
  'https://acct.r2.cloudflarestorage.com/mundotech-private/proofs/abc.webp?X-Amz-Signature=fake';

describe('GET /api/orders/[id]/payment-proof', () => {
  let handler: typeof import('@/app/api/orders/[id]/payment-proof/route').GET;
  let requireAdmin: typeof import('@/lib/api-auth').requireAdmin;
  let getPrivateProofReadUrl: typeof import('@/lib/r2').getPrivateProofReadUrl;
  let isR2PublicUrl: typeof import('@/lib/r2').isR2PublicUrl;

  beforeEach(async () => {
    vi.clearAllMocks();
    handler = (await import('@/app/api/orders/[id]/payment-proof/route')).GET;
    requireAdmin = (await import('@/lib/api-auth')).requireAdmin;
    getPrivateProofReadUrl = (await import('@/lib/r2')).getPrivateProofReadUrl;
    isR2PublicUrl = (await import('@/lib/r2')).isR2PublicUrl;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve 403 si el usuario no es ADMIN (CLIENT)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 }) as never,
    });

    const response = await handler(new Request('http://localhost/api/orders/o1/payment-proof'), {
      params: Promise.resolve({ id: 'o1' }),
    });
    expect(response.status).toBe(403);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('defensa en profundidad: si el handler se invoca sin sesión, requireAdmin también rechaza', async () => {
    // Contrato real end-to-end: guest sin sesión recibe 401 en middleware.ts
    // (isUserTokenApi) y NUNCA llega a este handler. Este test cubre solo la
    // capa interna: si por error middleware no interceptara, requireAdmin()
    // sigue rechazando sin sesión (403, misma respuesta que CLIENT no-ADMIN).
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 }) as never,
    });

    const response = await handler(new Request('http://localhost/api/orders/o1/payment-proof'), {
      params: Promise.resolve({ id: 'o1' }),
    });
    expect(response.status).toBe(403);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('devuelve 200 con URL firmada y headers no-store/no-referrer para ADMIN', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      paymentProofKey: 'proofs/abc.webp',
      paymentProofUrl: null,
    } as never);
    vi.mocked(getPrivateProofReadUrl).mockResolvedValue(SIGNED_URL);

    const response = await handler(new Request('http://localhost/api/orders/o1/payment-proof'), {
      params: Promise.resolve({ id: 'o1' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');

    const body = await response.json();
    expect(body.url).toBe(SIGNED_URL);
    expect(body.expiresIn).toBe(180);
    expect(JSON.stringify(body)).not.toContain('paymentProofKey');
  });

  it('no expone PII ni URLs firmadas en logs al fallar getPrivateProofReadUrl', async () => {
    const { logError } = await import('@/lib/safe-logger');

    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      paymentProofKey: 'proofs/secret.webp',
      paymentProofUrl: null,
    } as never);
    vi.mocked(getPrivateProofReadUrl).mockRejectedValue(
      new Error('R2 failure with https://signed.url?X-Amz-Signature=leak'),
    );

    const response = await handler(new Request('http://localhost/api/orders/o1/payment-proof'), {
      params: Promise.resolve({ id: 'o1' }),
    });

    expect(response.status).toBe(500);
    expect(logError).toHaveBeenCalled();
    const logArgs = vi.mocked(logError).mock.calls[0];
    expect(JSON.stringify(logArgs)).not.toContain('secret.webp');
    expect(JSON.stringify(logArgs)).not.toContain('X-Amz-Signature');
    expect(JSON.stringify(logArgs)).not.toContain('o1');
  });

  it('sirve legacyUrl solo si isR2PublicUrl valida el host', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'admin-1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      paymentProofKey: null,
      paymentProofUrl: 'https://cdn.mundotechve.com/proofs/legacy.webp',
    } as never);
    vi.mocked(isR2PublicUrl).mockReturnValue(true);

    const response = await handler(new Request('http://localhost/api/orders/o1/payment-proof'), {
      params: Promise.resolve({ id: 'o1' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.legacyUrl).toBe('https://cdn.mundotechve.com/proofs/legacy.webp');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });
});
