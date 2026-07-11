import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner before importing r2
const mockSend = vi.fn();

// Constructor mock for S3Client — use a real class so `new S3Client(...)` works
class MockS3Client {
  send = mockSend;
}

// Capture PutObjectCommand args for inspection — must be a class for `new`
const capturedPutArgs: Array<Record<string, unknown>> = [];
class MockPutObjectCommand {
  constructor(...args: Record<string, unknown>[]) {
    capturedPutArgs.push(args[0] ?? {});
  }
  get input() {
    return capturedPutArgs[capturedPutArgs.length - 1];
  }
}
class MockDeleteObjectCommand {}
class MockGetObjectCommand {}

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: MockPutObjectCommand,
  DeleteObjectCommand: MockDeleteObjectCommand,
  GetObjectCommand: MockGetObjectCommand,
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000000',
}));

// ─────────────────────────────────────────────────────────────
// assertProofKey tests
// ─────────────────────────────────────────────────────────────

describe('assertProofKey', () => {
  let assertProofKeyFn: typeof import('@/lib/r2')['assertProofKey'];

  beforeEach(async () => {
    vi.stubEnv('R2_PRIVATE_BUCKET_NAME', 'mundotech-proofs');
    vi.stubEnv('R2_ENDPOINT', 'https://test.r2.cloudflarestorage.com');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_BUCKET_NAME', 'mundotech-media');
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.test.com');
    const mod = await import('@/lib/r2');
    assertProofKeyFn = mod.assertProofKey;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta key válida con uuid', () => {
    expect(() => assertProofKeyFn('proofs/abc-123.webp')).not.toThrow();
  });

  it('acepta key con guion bajo', () => {
    expect(() => assertProofKeyFn('proofs/my_proof_1.jpg')).not.toThrow();
  });

  it('acepta key con uuid con guiones', () => {
    expect(() =>
      assertProofKeyFn('proofs/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png'),
    ).not.toThrow();
  });

  it('rechaza key con .. (path traversal)', () => {
    expect(() => assertProofKeyFn('proofs/../etc/passwd.jpg')).toThrow('..');
  });

  it('rechaza key con doble slash', () => {
    expect(() => assertProofKeyFn('proofs//secret.jpg')).toThrow('dobles');
  });

  it('rechaza key que comienza con /', () => {
    expect(() => assertProofKeyFn('/proofs/file.jpg')).toThrow('slash');
  });

  it('rechaza URL completa (https)', () => {
    expect(() => assertProofKeyFn('https://evil.com/proof.jpg')).toThrow('URL completa');
  });

  it('rechaza URL completa (http)', () => {
    expect(() => assertProofKeyFn('http://evil.com/proof.jpg')).toThrow('URL completa');
  });

  it('rechaza key con query params', () => {
    expect(() => assertProofKeyFn('proofs/file.jpg?token=abc')).toThrow('query');
  });

  it('rechaza key con fragmento', () => {
    expect(() => assertProofKeyFn('proofs/file.jpg#section')).toThrow('fragmentos');
  });

  it('rechaza key fuera de proofs/', () => {
    expect(() => assertProofKeyFn('products/photo.jpg')).toThrow('Formato');
  });

  it('rechaza key con extensión no imagen', () => {
    expect(() => assertProofKeyFn('proofs/file.txt')).toThrow('Formato');
    expect(() => assertProofKeyFn('proofs/file.svg')).toThrow('Formato');
    expect(() => assertProofKeyFn('proofs/file.exe')).toThrow('Formato');
  });

  it('rechaza key con extensión mayúscula', () => {
    expect(() => assertProofKeyFn('proofs/file.JPG')).toThrow('Formato');
  });

  it('rechaza string vacío', () => {
    expect(() => assertProofKeyFn('')).toThrow('requerida');
  });

  it('rechaza valor no string', () => {
    expect(() => assertProofKeyFn(null as unknown as string)).toThrow('requerida');
  });
});

// ─────────────────────────────────────────────────────────────
// Private R2 operations tests
// ─────────────────────────────────────────────────────────────

describe('uploadPrivateProof', () => {
  let uploadPrivateProofFn: typeof import('@/lib/r2')['uploadPrivateProof'];

  beforeEach(async () => {
    vi.stubEnv('R2_PRIVATE_BUCKET_NAME', 'mundotech-proofs');
    vi.stubEnv('R2_ENDPOINT', 'https://test.r2.cloudflarestorage.com');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_BUCKET_NAME', 'mundotech-media');
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.test.com');
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
    capturedPutArgs.length = 0;
    const mod = await import('@/lib/r2');
    uploadPrivateProofFn = mod.uploadPrivateProof;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sube comprobante y devuelve solo key (sin URL)', async () => {
    const result = await uploadPrivateProofFn({
      buffer: Buffer.from('fake-image-data'),
      key: 'proofs/test.webp',
      contentType: 'image/webp',
    });

    expect(result).toEqual({ key: 'proofs/test.webp' });
    expect(result).not.toHaveProperty('url');
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('lanza error si key es inválida', async () => {
    await expect(
      uploadPrivateProofFn({
        buffer: Buffer.from('x'),
        key: '../secret.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toThrow();
  });

  it('lanza error si falta R2_PRIVATE_BUCKET_NAME', async () => {
    vi.stubEnv('R2_PRIVATE_BUCKET_NAME', '');
    // La función ahora lee process.env en cada llamada, no necesita recarga
    await expect(
      uploadPrivateProofFn({
        buffer: Buffer.from('x'),
        key: 'proofs/test.webp',
        contentType: 'image/webp',
      }),
    ).rejects.toThrow('R2_PRIVATE_BUCKET_NAME');
  });

  it('usa Cache-Control private, no-store', async () => {
    capturedPutArgs.length = 0;
    await uploadPrivateProofFn({
      buffer: Buffer.from('data'),
      key: 'proofs/private.webp',
      contentType: 'image/webp',
    });

    const putInput = capturedPutArgs[0];
    expect(putInput?.CacheControl).toBe('private, no-store');
  });
});

describe('getPrivateProofReadUrl', () => {
  let getPrivateProofReadUrlFn: typeof import('@/lib/r2')['getPrivateProofReadUrl'];

  beforeEach(async () => {
    vi.stubEnv('R2_PRIVATE_BUCKET_NAME', 'mundotech-proofs');
    vi.stubEnv('R2_ENDPOINT', 'https://test.r2.cloudflarestorage.com');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_BUCKET_NAME', 'mundotech-media');
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.test.com');
    mockSend.mockReset();
    const mod = await import('@/lib/r2');
    getPrivateProofReadUrlFn = mod.getPrivateProofReadUrl;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa expiresIn por defecto de 180s', async () => {
    // getSignedUrl mock
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    vi.mocked(getSignedUrl).mockResolvedValue('https://signed.url/proof');
    await getPrivateProofReadUrlFn('proofs/test.webp');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 180 }),
    );
  });

  it('usa expiresIn personalizado', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    vi.mocked(getSignedUrl).mockResolvedValue('https://signed.url/proof');
    await getPrivateProofReadUrlFn('proofs/test.webp', 60);
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 60 }),
    );
  });

  it('lanza error si key es inválida (traversal)', async () => {
    await expect(
      getPrivateProofReadUrlFn('proofs/../../etc/passwd.jpg'),
    ).rejects.toThrow();
  });
});

describe('deletePrivateProof', () => {
  let deletePrivateProofFn: typeof import('@/lib/r2')['deletePrivateProof'];

  beforeEach(async () => {
    vi.stubEnv('R2_PRIVATE_BUCKET_NAME', 'mundotech-proofs');
    vi.stubEnv('R2_ENDPOINT', 'https://test.r2.cloudflarestorage.com');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_BUCKET_NAME', 'mundotech-media');
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.test.com');
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
    const mod = await import('@/lib/r2');
    deletePrivateProofFn = mod.deletePrivateProof;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('elimina comprobante del bucket privado', async () => {
    await deletePrivateProofFn('proofs/test.webp');
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('lanza error si key es inválida', async () => {
    await expect(deletePrivateProofFn('products/public.jpg')).rejects.toThrow('Formato');
  });
});

// ─────────────────────────────────────────────────────────────
// isR2PublicUrl (pública, no cambia)
// ─────────────────────────────────────────────────────────────

describe('isR2PublicUrl con R2_PRIVATE_BUCKET_NAME', () => {
  let isR2PublicUrlFn: typeof import('@/lib/r2')['isR2PublicUrl'];

  beforeEach(async () => {
    vi.stubEnv('R2_PRIVATE_BUCKET_NAME', 'mundotech-proofs');
    vi.stubEnv('R2_ENDPOINT', 'https://test.r2.cloudflarestorage.com');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_BUCKET_NAME', 'mundotech-media');
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.test.com');
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_BASE_URL', '');
    const mod = await import('@/lib/r2');
    isR2PublicUrlFn = mod.isR2PublicUrl;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta URL del dominio público R2', () => {
    expect(isR2PublicUrlFn('https://cdn.test.com/proofs/abc.webp')).toBe(true);
  });

  it('rechaza host ajeno', () => {
    expect(isR2PublicUrlFn('https://evil.com/proof.jpg')).toBe(false);
  });

  it('rechaza suplantación por sufijo', () => {
    expect(isR2PublicUrlFn('https://cdn.test.com.evil.com/x')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Compatibilidad con migración BD limpia y existente
// ─────────────────────────────────────────────────────────────

describe('migration: paymentProofKey columna aditiva', () => {
  it('paymentProofKey y paymentProofUrl son opcionales en el tipo Order', async () => {
    const { prismaOrderToOrder } = await import('@/lib/definitions');
    const mockPrismaOrder = {
      id: 'test-id',
      orderNumber: 1,
      createdAt: new Date(),
      customerId: null,
      customerName: 'Test',
      total: 100 as unknown as number,
      status: 'Pendiente',
      paymentMethod: 'Transferencia Bancaria',
      shippingAddress: 'Addr',
      shippingCity: 'City',
      shippingState: 'State',
      shippingZipCode: 'N/A',
      shippingCountry: 'Venezuela',
      items: [],
    } as Parameters<typeof prismaOrderToOrder>[0];

    // Sin paymentProofKey ni paymentProofUrl en el input
    const order = prismaOrderToOrder(mockPrismaOrder);
    // paymentProofKey usa ?? null → null, paymentProofUrl no tiene default → undefined
    expect(order.paymentProofKey).toBeNull();
    expect(order.paymentProofUrl).toBeUndefined();

    // Con null explícito → null (columna nullable en BD)
    const orderWithNulls = prismaOrderToOrder({
      ...mockPrismaOrder,
      paymentProofKey: null,
      paymentProofUrl: null,
    });
    expect(orderWithNulls.paymentProofKey).toBeNull();
    expect(orderWithNulls.paymentProofUrl).toBeNull();

    // Con valores concretos → pasan correctamente
    const orderWithValues = prismaOrderToOrder({
      ...mockPrismaOrder,
      paymentProofKey: 'proofs/abc.webp',
      paymentProofUrl: null,
    });
    expect(orderWithValues.paymentProofKey).toBe('proofs/abc.webp');
    expect(orderWithValues.paymentProofUrl).toBeNull();
  });
});
