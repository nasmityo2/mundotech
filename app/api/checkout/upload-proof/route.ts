import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

/** Comprobantes de pago en checkout: público para invitados y clientes (no ADMIN). */
const PROOF_FOLDER = 'mundotech/order-proofs';
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

function extensionLooksLikeImage(name: string): boolean {
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(name);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporcionó archivo.' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `La imagen supera el máximo permitido (${MAX_BYTES / (1024 * 1024)} MB).` },
        { status: 400 }
      );
    }

    const mime = (file.type || '').toLowerCase().trim();
    if (mime && !ALLOWED_TYPES.has(mime)) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.' },
        { status: 400 }
      );
    }

    if (!mime && !extensionLooksLikeImage(file.name)) {
      return NextResponse.json(
        { error: 'No pudimos reconocer el tipo de archivo. Usa una imagen JPG o PNG.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${mime || 'image/jpeg'};base64,${buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: PROOF_FOLDER,
      resource_type: 'image',
      transformation: [
        {
          quality: 'auto:good',
          fetch_format: 'auto',
          width: 1600,
          crop: 'limit',
        },
      ],
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error('[checkout/upload-proof] Cloudinary error:', err);
    return NextResponse.json(
      { error: 'No pudimos subir el comprobante. Intenta con otra imagen o más tarde.' },
      { status: 500 }
    );
  }
}
