import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import cloudinary from '@/lib/cloudinary';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin } from '@/lib/security';
import { detectImageMimeFromBuffer, isAllowedProofMime } from '@/lib/detect-image-mime';

const PROOF_FOLDER = 'mundotech/order-proofs';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  // Mitigación CSRF (formularios cross-site con cookies de sesión)
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  // Requiere sesión activa — rechazar invitados no autenticados
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión para subir el comprobante de pago.' },
      { status: 401 }
    );
  }

  // Rate limit: máx 10 uploads por usuario por 10 minutos
  const userId = session.user?.id ?? getClientIp(request);
  if (rateLimit(`upload-proof:${userId}`, { limit: 10, windowMs: 10 * 60_000 })) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes de subida. Espera unos minutos.' },
      { status: 429 }
    );
  }

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
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verificación de magic bytes — la única fuente confiable del tipo real del archivo.
    // El Content-Type del cliente y la extensión del nombre pueden ser falsificados.
    const detectedMime = detectImageMimeFromBuffer(buffer);
    if (!detectedMime || !isAllowedProofMime(detectedMime)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usa una imagen JPG, PNG o WEBP.' },
        { status: 400 }
      );
    }

    const base64 = `data:${detectedMime};base64,${buffer.toString('base64')}`;

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
