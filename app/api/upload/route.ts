import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';
import { rejectInvalidMutationOrigin } from '@/lib/security';
import { detectImageMimeFromBuffer, isAllowedAdminUploadMime } from '@/lib/detect-image-mime';
import { processImage } from '@/lib/image-processing';
import { buildKey, uploadToR2, type R2Folder } from '@/lib/r2';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** PRD-047: enum estricto de destinos — un purpose libre permitía elegir folder arbitrario. */
const purposeSchema = z.enum(['banner', 'product', 'products', 'category', 'tracking']);

const UPLOAD_BY_PURPOSE: Record<
  z.infer<typeof purposeSchema>,
  { folder: R2Folder; maxWidth: number }
> = {
  banner:   { folder: 'banners',  maxWidth: 1920 },
  product:  { folder: 'products', maxWidth: 1200 },
  products: { folder: 'products', maxWidth: 1200 },
  category: { folder: 'assets',   maxWidth: 1920 },
  tracking: { folder: 'assets',   maxWidth: 1600 },
};

export async function POST(request: Request) {
  // PRD-046: mitigación CSRF (sesión admin podría ser forzada cross-site).
  if (!rejectInvalidMutationOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  // PRD-046: rate limit por admin — frena abuso del cupo de storage si la
  // sesión se compromete (60 imágenes por 10 min es de sobra para operar).
  const adminId = auth.session.user?.id ?? 'admin';
  if (await rateLimit(`admin-upload:${adminId}`, { limit: 60, windowMs: 10 * 60_000 })) {
    return NextResponse.json(
      { error: 'Demasiadas subidas en poco tiempo. Espera unos minutos.' },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo.' }, { status: 400 });
    }

    // Validar tamaño antes de leer el buffer completo
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `El archivo supera el tamaño máximo permitido (${MAX_BYTES / (1024 * 1024)} MB).` },
        { status: 413 }
      );
    }

    const parsedPurpose = purposeSchema.safeParse(String(formData.get('purpose') ?? 'banner'));
    if (!parsedPurpose.success) {
      return NextResponse.json(
        { error: `purpose inválido. Valores permitidos: ${purposeSchema.options.join(', ')}.` },
        { status: 400 }
      );
    }
    const purpose = parsedPurpose.data;
    const { folder, maxWidth } = UPLOAD_BY_PURPOSE[purpose];

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validar tipo real por magic bytes — no confiar en file.type del navegador.
    const detectedMime = detectImageMimeFromBuffer(buffer);
    if (!detectedMime || !isAllowedAdminUploadMime(detectedMime)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, WEBP o GIF.' },
        { status: 415 }
      );
    }

    const { buffer: processed, contentType, ext, width, height } = await processImage(buffer, { maxWidth });
    const rawName = formData.get('name') ?? formData.get('slug');
    const descriptiveName =
      typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined;
    const key = buildKey(folder, ext, descriptiveName);
    const url = await uploadToR2({ buffer: processed, key, contentType });

    return NextResponse.json({
      url,
      publicId: key,
      width,
      height,
      mimeType: contentType,
    });
  } catch (err) {
    console.error('[upload] R2 error:', err);
    return NextResponse.json(
      { error: 'Error al subir imagen. Verifica la configuración de almacenamiento.' },
      { status: 500 }
    );
  }
}
