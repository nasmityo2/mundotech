import sharp from 'sharp';
import {
  detectImageMimeFromBuffer,
  type DetectedImageMime,
} from '@/lib/detect-image-mime';

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  ext: string;
  width: number;
  height: number;
}

const MIME_TO_EXT: Record<DetectedImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function originalImagePayload(buffer: Buffer, mime: DetectedImageMime): ProcessedImage {
  return {
    buffer,
    contentType: mime,
    ext: MIME_TO_EXT[mime],
    width: 0,
    height: 0,
  };
}

/**
 * Igual que processImage, pero si sharp no carga (p. ej. binario nativo ausente en
 * el runtime) guarda el buffer original sin convertir — evita 500 en comprobantes.
 */
export async function processImageWithFallback(
  buffer: Buffer,
  options: { maxWidth: number },
): Promise<ProcessedImage> {
  const detectedMime = detectImageMimeFromBuffer(buffer);
  if (!detectedMime) {
    throw new Error('Tipo de imagen no reconocido.');
  }

  try {
    return await processImage(buffer, options);
  } catch (err) {
    console.error('[upload-proof] sharp failed, storing original:', err);
    return originalImagePayload(buffer, detectedMime);
  }
}

/**
 * Redimensiona y convierte a WebP (quality 80), salvo GIF animados que se
 * conservan tal cual para no perder frames.
 */
export async function processImage(
  buffer: Buffer,
  { maxWidth }: { maxWidth: number },
): Promise<ProcessedImage> {
  const detectedMime = detectImageMimeFromBuffer(buffer);
  if (!detectedMime) {
    throw new Error('Tipo de imagen no reconocido.');
  }

  if (detectedMime === 'image/gif') {
    const meta = await sharp(buffer, { animated: true }).metadata();
    return {
      buffer,
      contentType: 'image/gif',
      ext: 'gif',
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
  }

  const processed = await sharp(buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: processed.data,
    contentType: 'image/webp',
    ext: 'webp',
    width: processed.info.width,
    height: processed.info.height,
  };
}

/** Para migración: conserva GIF; el resto pasa por processImage. */
export async function processImageForMigration(
  buffer: Buffer,
  mime: DetectedImageMime,
  maxWidth: number,
): Promise<ProcessedImage> {
  if (mime === 'image/gif') {
    const meta = await sharp(buffer, { animated: true }).metadata();
    return {
      buffer,
      contentType: mime,
      ext: MIME_TO_EXT[mime],
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
  }
  return processImage(buffer, { maxWidth });
}
