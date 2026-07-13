import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSend = vi.fn();

class MockS3Client {
  send = mockSend;
}

class MockPutObjectCommand {
  constructor(...args: Record<string, unknown>[]) {
    void args;
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
  getSignedUrl: vi.fn().mockResolvedValue('https://signed.example/proof'),
}));

describe('R2 en E2E_MODE=1 (sin red)', () => {
  beforeEach(() => {
    mockSend.mockReset();
    vi.stubEnv('E2E_MODE', '1');
    vi.unstubAllEnvs();
    vi.stubEnv('E2E_MODE', '1');
    // Sin credenciales R2 — en E2E no deben ser necesarias.
    vi.stubEnv('R2_ENDPOINT', '');
    vi.stubEnv('R2_ACCESS_KEY_ID', '');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', '');
    vi.stubEnv('R2_BUCKET_NAME', '');
    vi.stubEnv('R2_PUBLIC_BASE_URL', '');
    vi.stubEnv('R2_PRIVATE_BUCKET_NAME', '');
    vi.stubEnv('R2_PRIVATE_ACCESS_KEY_ID', '');
    vi.stubEnv('R2_PRIVATE_SECRET_ACCESS_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uploadToR2 retorna URL determinista sin S3Client.send', async () => {
    const { uploadToR2 } = await import('@/lib/r2');
    const url = await uploadToR2({
      buffer: Buffer.from('x'),
      key: 'products/e2e-test.png',
      contentType: 'image/png',
    });
    expect(url).toBe('https://cdn.e2e.test/products/e2e-test.png');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('deleteFromR2 es no-op sin S3Client.send', async () => {
    const { deleteFromR2 } = await import('@/lib/r2');
    await deleteFromR2('products/e2e-test.png');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('uploadPrivateProof devuelve key sin S3Client.send', async () => {
    const { uploadPrivateProof } = await import('@/lib/r2');
    const result = await uploadPrivateProof({
      buffer: Buffer.from('x'),
      key: 'proofs/e2e-proof.png',
      contentType: 'image/png',
    });
    expect(result).toEqual({ key: 'proofs/e2e-proof.png' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('getPrivateProofReadUrl devuelve data URL fija sin S3Client.send', async () => {
    const { getPrivateProofReadUrl } = await import('@/lib/r2');
    const url = await getPrivateProofReadUrl('proofs/e2e-proof.png');
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('deletePrivateProof es no-op sin S3Client.send', async () => {
    const { deletePrivateProof } = await import('@/lib/r2');
    await deletePrivateProof('proofs/e2e-proof.png');
    expect(mockSend).not.toHaveBeenCalled();
  });
});
