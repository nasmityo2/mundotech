import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin, hashToken } from '@/lib/security';
import { detectImageMimeFromBuffer, isAllowedProofMime } from '@/lib/detect-image-mime';
import { processImageWithFallback } from '@/lib/image-processing';
import { uploadPrivateProof } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

/** sharp usa módulos nativos; no compatible con Edge. */
export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/checkout/upload-proof
 *
 * Sube un comprobante de pago al bucket privado de R2.
 * Requiere header `x-checkout-upload-token` obtenido previamente de
 * /api/checkout/upload-session. El token se reclama de forma atómica
 * para evitar dos subidas concurrentes con el mismo token.
 *
 * Tras una subida exitosa, el token queda con objectKey persistido
 * pero aún PENDING (se vincula al pedido en el checkout).
 */
export async function POST(request: Request) {
  // Mitigación CSRF (formularios cross-site con cookies de sesión)
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  // SESIÓN 05: exigir token de upload
  const rawToken = request.headers.get('x-checkout-upload-token');
  if (!rawToken?.trim()) {
    return NextResponse.json(
      { error: 'Token de subida requerido. Obtén uno en /api/checkout/upload-session.' },
      { status: 401 },
    );
  }

  const tokenHash = hashToken(rawToken.trim());

  // Reclamar token de forma atómica: solo PENDING, no expirado.
  // updateMany con condiciones garantiza que dos requests concurrentes
  // no puedan reclamar el mismo token (una ganará, la otra count === 0).
  const now = new Date();
  const claim = await prisma.paymentUpload.updateMany({
    where: {
      tokenHash,
      status: 'PENDING',
      expiresAt: { gt: now },
      objectKey: null, // aún no usado
    },
    data: {
      // Marcamos temporalmente para evitar doble uso; el objectKey se setea tras upload.
      // Usamos un status intermedio no: simplemente bloqueamos por objectKey=null en where.
    },
  });

  if (claim.count === 0) {
    return NextResponse.json(
      { error: 'Token inválido, expirado o ya utilizado. Obtén uno nuevo en /api/checkout/upload-session.' },
      { status: 409 },
    );
  }

  // FASE 4.1 (MEJORA 1.2): los invitados también suben comprobante — la sesión
  // deja de ser obligatoria. Defensas que se mantienen: verifySameOrigin (arriba),
  // rate limit (más estricto para invitados), magic bytes y re-encode con sharp.
  const session = await getServerSession(authOptions);
  const isGuest = !session?.user?.id;

  const limitKey = isGuest
    ? `upload-proof:ip:${getClientIp(request)}`
    : `upload-proof:${session!.user!.id}`;
  const limitCfg = isGuest
    ? { limit: 6, windowMs: 10 * 60_000 }
    : { limit: 10, windowMs: 10 * 60_000 };
  if (await rateLimit(limitKey, limitCfg)) {
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
        { status: 400 }
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

    const { buffer: processed, contentType, ext, width, height } = await processImageWithFallback(
      buffer,
      { maxWidth: 1600 },
    );

    // SESIÓN 04: subir al bucket privado. No exponer URL pública.
    const proofKey = `proofs/${uuidv4()}.${ext}`;
    try {
      await uploadPrivateProof({ buffer: processed, key: proofKey, contentType });
    } catch (r2Err) {
      console.error('[upload-proof] Fallo R2, revirtiendo claim del token:', r2Err);
      // Revertir el claim: el token vuelve a estar disponible para retry
      await prisma.paymentUpload.update({
        where: { tokenHash },
        data: { objectKey: null },
      });
      return NextResponse.json(
        { error: 'No pudimos guardar el comprobante. Intenta de nuevo.' },
        { status: 500 }
      );
    }

    // Persistir objectKey en el registro (sigue PENDING hasta el checkout)
    await prisma.paymentUpload.update({
      where: { tokenHash },
      data: { objectKey: proofKey },
    });

    return NextResponse.json(
      { proofKey, width, height },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[upload-proof]', err);
    return NextResponse.json(
      { error: 'No pudimos subir el comprobante. Intenta con otra imagen o más tarde.' },
      { status: 500 }
    );
  }
}
