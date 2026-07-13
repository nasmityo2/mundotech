/**
 * lib/client-image-normalize.ts — normalización de HEIC/HEIF y compresión
 * client-side antes de subir comprobantes/fotos. Requiere jsdom porque usa
 * File/Blob/canvas del navegador.
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockHeic2any = vi.fn();

vi.mock('heic2any', () => ({
  default: mockHeic2any,
}));

function makeFile(name: string, type: string, size: number): File {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
}

describe('isHeicFile', () => {
  it('detecta HEIC por MIME', async () => {
    const { isHeicFile } = await import('@/lib/client-image-normalize');
    expect(isHeicFile(makeFile('foto.bin', 'image/heic', 1024))).toBe(true);
    expect(isHeicFile(makeFile('foto.bin', 'image/heif', 1024))).toBe(true);
  });

  it('detecta HEIC por extensión cuando el type viene vacío', async () => {
    const { isHeicFile } = await import('@/lib/client-image-normalize');
    expect(isHeicFile(makeFile('IMG_0001.HEIC', '', 1024))).toBe(true);
    expect(isHeicFile(makeFile('IMG_0002.heif', '', 1024))).toBe(true);
  });

  it('no marca un JPEG normal como HEIC', async () => {
    const { isHeicFile } = await import('@/lib/client-image-normalize');
    expect(isHeicFile(makeFile('foto.jpg', 'image/jpeg', 1024))).toBe(false);
  });
});

describe('normalizeImageForUpload', () => {
  beforeEach(() => {
    mockHeic2any.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('convierte un HEIC a un File JPEG', async () => {
    const { normalizeImageForUpload } = await import('@/lib/client-image-normalize');
    const smallJpegBlob = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });
    mockHeic2any.mockResolvedValue(smallJpegBlob);

    const heicFile = makeFile('IMG_1234.HEIC', 'image/heic', 3 * 1024 * 1024);
    const result = await normalizeImageForUpload(heicFile, { maxOutputBytes: 5 * 1024 * 1024 });

    expect(mockHeic2any).toHaveBeenCalledWith(
      expect.objectContaining({ toType: 'image/jpeg', quality: 0.82 }),
    );
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('IMG_1234.jpg');
  });

  it('rechaza un archivo fuente mayor a 20 MB', async () => {
    const { normalizeImageForUpload } = await import('@/lib/client-image-normalize');
    const hugeFile = makeFile('enorme.jpg', 'image/jpeg', 21 * 1024 * 1024);

    await expect(
      normalizeImageForUpload(hugeFile, { maxOutputBytes: 5 * 1024 * 1024 }),
    ).rejects.toThrow(/20 MB/);
    expect(mockHeic2any).not.toHaveBeenCalled();
  });

  it('rechaza una salida mayor al máximo permitido', async () => {
    const { normalizeImageForUpload } = await import('@/lib/client-image-normalize');
    // 500 KB: por debajo del umbral de downscale (1.5 MB) así que no se
    // reprocesa, pero sigue superando el maxOutputBytes solicitado (100 B).
    const jpegFile = makeFile('grande.jpg', 'image/jpeg', 500 * 1024);

    await expect(
      normalizeImageForUpload(jpegFile, { maxOutputBytes: 100 }),
    ).rejects.toThrow(/supera el máximo permitido/);
  });

  it('no modifica un JPEG pequeño (mismo File, mismo contenido)', async () => {
    const { normalizeImageForUpload } = await import('@/lib/client-image-normalize');
    const jpegFile = makeFile('pequena.jpg', 'image/jpeg', 200 * 1024);

    const result = await normalizeImageForUpload(jpegFile, { maxOutputBytes: 5 * 1024 * 1024 });

    expect(result).toBe(jpegFile);
    expect(mockHeic2any).not.toHaveBeenCalled();
  });
});
