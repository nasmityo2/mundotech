import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';

const R2_FOLDERS = ['products', 'banners', 'proofs', 'assets'] as const;
export type R2Folder = (typeof R2_FOLDERS)[number];

const REQUIRED_ENV = [
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_BASE_URL',
] as const;

let envChecked = false;

function assertR2Env(): void {
  if (envChecked) return;
  envChecked = true;

  const missing = REQUIRED_ENV.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `[r2] Faltan variables de entorno: ${missing.join(', ')}. ` +
        'Configura R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME y R2_PUBLIC_BASE_URL.',
    );
  }
}

function getConfig() {
  assertR2Env();
  return {
    endpoint: process.env.R2_ENDPOINT!.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    bucket: process.env.R2_BUCKET_NAME!.trim(),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL!.trim().replace(/\/$/, ''),
  };
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const { endpoint, accessKeyId, secretAccessKey } = getConfig();
    s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? '';
export const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

export function buildKey(folder: R2Folder, ext: string, descriptiveName?: string): string {
  assertR2Env();
  if (!R2_FOLDERS.includes(folder)) {
    throw new Error(`[r2] Carpeta no permitida: ${folder}`);
  }
  const safeExt = ext.replace(/^\./, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!safeExt) {
    throw new Error('[r2] Extensión de archivo inválida.');
  }

  const trimmedName = descriptiveName?.trim();
  if (trimmedName) {
    const slug = slugify(trimmedName).slice(0, 60).replace(/-+$/g, '');
    if (slug) {
      const shortId = uuidv4().replace(/-/g, '').slice(0, 8);
      return `${folder}/${slug}-${shortId}.${safeExt}`;
    }
  }

  return `${folder}/${uuidv4()}.${safeExt}`;
}

export async function uploadToR2({
  buffer,
  key,
  contentType,
  cacheControl = 'public, max-age=31536000, immutable',
}: {
  buffer: Buffer;
  key: string;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const { bucket, publicBaseUrl } = getConfig();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
  return `${publicBaseUrl}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const { bucket } = getConfig();
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

/** Hostname del dominio público de R2 (para CSP, validación de URLs, next/image). */
export function getR2PublicHostname(): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
}

/** true si la URL apunta al dominio público configurado en R2_PUBLIC_BASE_URL. */
export function isR2PublicUrl(url: string): boolean {
  const hostname = getR2PublicHostname();
  if (!hostname) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === hostname;
  } catch {
    return false;
  }
}

/** Extrae la object key de una URL pública de R2, o null si no pertenece al bucket. */
export function keyFromR2PublicUrl(url: string): string | null {
  if (!isR2PublicUrl(url)) return null;
  const base = R2_PUBLIC_BASE_URL || getConfig().publicBaseUrl;
  const prefix = `${base}/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
