import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin } from '@/lib/security';
import { detectImageMimeFromBuffer, isAllowedProofMime } from '@/lib/detect-image-mime';
import { processImage } from '@/lib/image-processing';
import { buildKey, uploadToR2 } from '@/lib/r2';

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
  if (await rateLimit(`upload-proof:${userId}`, { limit: 10, windowMs: 10 * 60_000 })) {
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

    const { buffer: processed, contentType, ext, width, height } = await processImage(buffer, {
      maxWidth: 1600,
    });
    const key = buildKey('proofs', ext);
    const url = await uploadToR2({ buffer: processed, key, contentType });

    return NextResponse.json({
      url,
      publicId: key,
      width,
      height,
    });
  } catch (err) {
    console.error('[checkout/upload-proof] R2 error:', err);
    return NextResponse.json(
      { error: 'No pudimos subir el comprobante. Intenta con otra imagen o más tarde.' },
      { status: 500 }
    );
  }
}
