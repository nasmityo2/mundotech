/**
 * Normalización de imágenes en el cliente antes de subirlas.
 *
 * Los iPhone exportan fotos como HEIC/HEIF por defecto, formato que el
 * servidor NUNCA acepta (whitelist de magic bytes en lib/detect-image-mime.ts
 * solo permite JPEG/PNG/WEBP). Este helper convierte HEIC/HEIF a JPEG en el
 * cliente (import dinámico de `heic2any`, evita bundlear la lib para el resto
 * de usuarios) y comprime si el resultado sigue pesando demasiado. El límite
 * de salida real sigue validándolo el servidor — esto es solo UX.
 */

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const DOWNSCALE_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
const DOWNSCALE_MAX_SIDE = 2000;
const DOWNSCALE_JPEG_QUALITY = 0.82;
const HEIC_JPEG_QUALITY = 0.82;

const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);
const HEIC_EXTENSION_RE = /\.(heic|heif)$/i;

declare global {
  interface Window {
    /**
     * Seam exclusivo para E2E (Playwright no puede fabricar un HEIC real ni
     * interceptar el chunk de `heic2any` de forma estable). Gateado también
     * por NODE_ENV !== 'production' — en producción esta rama nunca se toma
     * aunque alguien defina la propiedad en la consola del navegador.
     */
    __E2E_HEIC_DECODER__?: (file: File) => Promise<Blob>;
  }
}

export interface NormalizeImageOptions {
  /** Tamaño máximo del archivo resultante, en bytes. */
  maxOutputBytes: number;
}

/** MIME HEIC/HEIF, o extensión .heic/.heif cuando el navegador no informa `type`. */
export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (HEIC_MIME_TYPES.has(type)) return true;
  return HEIC_EXTENSION_RE.test(file.name);
}

function toJpegFileName(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, '').trim();
  return `${base || 'imagen'}.jpg`;
}

async function decodeHeicToJpegBlob(file: File): Promise<Blob> {
  const e2eDecoder =
    process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
      ? window.__E2E_HEIC_DECODER__
      : undefined;
  if (e2eDecoder) return e2eDecoder(file);

  const { default: heic2any } = await import('heic2any');
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: HEIC_JPEG_QUALITY,
  });
  return Array.isArray(result) ? result[0] : result;
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const blob = await decodeHeicToJpegBlob(file);
  return new File([blob], toJpegFileName(file.name), { type: 'image/jpeg' });
}

async function downscaleToJpeg(
  file: File,
  maxSide: number,
  quality: number,
): Promise<File> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    if (!blob) return file;

    return new File([blob], toJpegFileName(file.name), { type: 'image/jpeg' });
  } finally {
    bitmap?.close();
  }
}

/**
 * Convierte HEIC/HEIF a JPEG y/o comprime la imagen si supera el tamaño
 * máximo de salida. Si el archivo ya es un JPEG/PNG/WEBP pequeño, se
 * devuelve sin modificar (mismo File, mismo contenido).
 */
export async function normalizeImageForUpload(
  file: File,
  { maxOutputBytes }: NormalizeImageOptions,
): Promise<File> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(
      `La imagen de origen supera el máximo permitido (${Math.round(MAX_SOURCE_BYTES / (1024 * 1024))} MB).`,
    );
  }

  let result = file;

  if (isHeicFile(result)) {
    result = await convertHeicToJpeg(result);
  }

  if (result.size > DOWNSCALE_THRESHOLD_BYTES) {
    result = await downscaleToJpeg(result, DOWNSCALE_MAX_SIDE, DOWNSCALE_JPEG_QUALITY);
  }

  if (result.size > maxOutputBytes) {
    throw new Error(
      `La imagen resultante (${(result.size / (1024 * 1024)).toFixed(1)} MB) supera el máximo permitido ` +
        `(${Math.round(maxOutputBytes / (1024 * 1024))} MB). Intenta con otra foto.`,
    );
  }

  return result;
}
