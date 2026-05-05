import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { requireAdmin } from '@/lib/api-auth';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

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

    // Validar tipo MIME
    const mime = (file.type || '').toLowerCase().trim();
    if (!mime || !ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, WEBP o GIF.' },
        { status: 415 }
      );
    }

    const purpose = String(formData.get('purpose') ?? 'banner');
    const folder =
      purpose === 'product' || purpose === 'products'
        ? 'mundotech/products'
        : 'mundotech/banners';

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${mime};base64,${buffer.toString('base64')}`;

    const isProduct = folder === 'mundotech/products';

    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: 'image',
      transformation: [
        {
          quality:      'auto:good',
          fetch_format: 'auto',
          width:        isProduct ? 1200 : 1920,
          crop:         'limit',
        },
      ],
    });

    return NextResponse.json({
      url:      result.secure_url,
      publicId: result.public_id,
      width:    result.width,
      height:   result.height,
    });
  } catch (err) {
    console.error('[upload] Cloudinary error:', err);
    return NextResponse.json(
      { error: 'Error al subir imagen. Verifica las credenciales de Cloudinary.' },
      { status: 500 }
    );
  }
}
