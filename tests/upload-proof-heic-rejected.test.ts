/**
 * Defense-in-depth: aunque el cliente normaliza HEIC/HEIF a JPEG antes de
 * subir (lib/client-image-normalize.ts), el servidor NUNCA debe aceptar un
 * HEIC crudo — la whitelist de magic bytes en lib/detect-image-mime.ts solo
 * permite JPEG/PNG/WEBP para comprobantes de pago.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentUpload: {
      updateMany: vi.fn(),
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

vi.mock('@/lib/r2', () => ({
  uploadPrivateProof: vi.fn(),
  deletePrivateProof: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

vi.mock('@/lib/safe-logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}));

/** Header 'ftyp' de ISOBMFF/HEIC — no coincide con ninguna firma JPEG/PNG/WEBP/GIF. */
const HEIC_MAGIC_BYTES = Buffer.from([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // size + "ftyp"
  0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00, // "heic"
  0x6d, 0x69, 0x66, 0x31, 0x68, 0x65, 0x69, 0x63, // "mif1heic"
  0x6d, 0x69, 0x61, 0x66, 0x68, 0x65, 0x76, 0x63, // "miafhevc"
]);

function buildRequest(fileBytes: Buffer, fileName: string, mimeType: string): Request {
  const formData = new FormData();
  formData.append('file', new File([new Uint8Array(fileBytes)], fileName, { type: mimeType }));
  return new Request('http://localhost/api/checkout/upload-proof', {
    method: 'POST',
    headers: { 'x-checkout-upload-token': 'raw-token-value' },
    body: formData,
  });
}

describe('POST /api/checkout/upload-proof — rechaza HEIC crudo (defense in depth)', () => {
  let handler: typeof import('@/app/api/checkout/upload-proof/route').POST;
  let prisma: typeof import('@/lib/prisma').prisma;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('CHECKOUT_MODE', 'full');
    vi.resetModules();

    const rateLimit = await import('@/lib/rate-limit');
    vi.mocked(rateLimit.rateLimitCritical).mockResolvedValue({ limited: false, retryAfterSeconds: 0, source: 'memory' });
    const security = await import('@/lib/security');
    vi.mocked(security.rejectInvalidMutationOrigin).mockReturnValue(null);
    const nextAuth = await import('next-auth/next');
    vi.mocked(nextAuth.getServerSession).mockResolvedValue({
      user: { id: 'user-heic-test' },
    } as never);

    handler = (await import('@/app/api/checkout/upload-proof/route')).POST;
    prisma = (await import('@/lib/prisma')).prisma;
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('devuelve 400 y no reclama el token si el archivo trae magic bytes HEIC', async () => {
    const request = buildRequest(HEIC_MAGIC_BYTES, 'foto-iphone.heic', 'image/heic');
    const response = await handler(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/JPG, PNG o WEBP/);
    expect(prisma.paymentUpload.updateMany).not.toHaveBeenCalled();
  });

  it('devuelve 400 si un archivo HEIC se disfraza con nombre .jpg y type image/jpeg', async () => {
    // El cliente normaliza a JPEG real antes de subir; si algo se salta esa
    // normalización (o intenta forzar el whitelist), los magic bytes siguen
    // siendo HEIC y el servidor debe rechazarlo igual.
    const request = buildRequest(HEIC_MAGIC_BYTES, 'foto-iphone.jpg', 'image/jpeg');
    const response = await handler(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/JPG, PNG o WEBP/);
    expect(prisma.paymentUpload.updateMany).not.toHaveBeenCalled();
  });

  it('acepta un JPEG real (magic bytes válidos) y reclama el token', async () => {
    vi.mocked(prisma.paymentUpload.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(prisma.paymentUpload.updateMany).mockResolvedValueOnce({ count: 1 });
    const r2 = await import('@/lib/r2');
    vi.mocked(r2.uploadPrivateProof).mockResolvedValue({ key: 'proofs/00000000-0000-0000-0000-000000000000.jpg' });

    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const request = buildRequest(jpegBytes, 'comprobante.jpg', 'image/jpeg');
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(prisma.paymentUpload.updateMany).toHaveBeenCalled();
  });
});
