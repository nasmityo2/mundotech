import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin, hashToken } from '@/lib/security';
import { detectImageMimeFromBuffer, isAllowedProofMime } from '@/lib/detect-image-mime';
import { processImageWithFallback } from '@/lib/image-processing';
import { uploadPrivateProof, deletePrivateProof } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

/** sharp usa módulos nativos; no compatible con Edge. */
export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/checkout/upload-proof
 *
 * Sube un comprobante de pago al bucket privado de R2.
 * Requiere header `x-checkout-upload-token` obtenido previamente de
 * /api/checkout/upload-session. El token se reclama PENDING → UPLOADING
 * para evitar dos subidas concurrentes con el mismo token.
 *
 * Tras una subida exitosa, el registro vuelve a PENDING con objectKey
 * persistido (se vincula al pedido en el checkout).
 *
 * La respuesta NO expone proofKey: el token ya identifica el registro.
 */
export async function POST(request: Request) {
  // Mitigación CSRF (formularios cross-site con cookies de sesión)
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const rawToken = request.headers.get('x-checkout-upload-token');
  if (!rawToken?.trim()) {
    return NextResponse.json(
      { error: 'Token de subida requerido. Obtén uno en /api/checkout/upload-session.' },
      { status: 401 },
    );
  }

  const tokenHash = hashToken(rawToken.trim());

  // Cargar sesión ANTES del claim (no cambia estado hasta que todo esté listo)
  const session = await getServerSession(authOptions);
  const isGuest = !session?.user?.id;

  // Rate limit ANTES del claim
  const limitKey = isGuest
    ? `upload-proof:ip:${getClientIp(request)}`
    : `upload-proof:${session!.user!.id}`;
  const limitCfg = isGuest
    ? { limit: 6, windowMs: 10 * 60_000 }
    : { limit: 10, windowMs: 10 * 60_000 };
  if (await rateLimit(limitKey, limitCfg)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes de subida. Espera unos minutos.' },
      { status: 429 },
    );
  }

  // Variables de control para cleanup
  let claimed = false;
  let uploadedKey: string | null = null;
  let finalized = false;

  try {
    // Leer y validar el archivo ANTES del claim
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
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verificación de magic bytes
    const detectedMime = detectImageMimeFromBuffer(buffer);
    if (!detectedMime || !isAllowedProofMime(detectedMime)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usa una imagen JPG, PNG o WEBP.' },
        { status: 400 },
      );
    }

    const { buffer: processed, contentType, ext, width, height } =
      await processImageWithFallback(buffer, { maxWidth: 1600 });

    // ── RECLAMAR TOKEN: PENDING → UPLOADING ────────────────────
    const claim = await prisma.paymentUpload.updateMany({
      where: {
        tokenHash,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        objectKey: null,
        orderId: null,
      },
      data: {
        status: 'UPLOADING',
      },
    });

    if (claim.count !== 1) {
      return NextResponse.json(
        {
          error:
            'Token inválido, expirado, ya utilizado o con una subida en proceso.',
        },
        { status: 409 },
      );
    }

    claimed = true;

    // ── SUBIR A R2 ─────────────────────────────────────────────
    const proofKey = `proofs/${uuidv4()}.${ext}`;

    await uploadPrivateProof({
      buffer: processed,
      key: proofKey,
      contentType,
    });

    uploadedKey = proofKey;

    // ── FINALIZAR: UPLOADING → PENDING (con objectKey) ─────────
    const finalizedUpload = await prisma.paymentUpload.updateMany({
      where: {
        tokenHash,
        status: 'UPLOADING',
        objectKey: null,
        orderId: null,
      },
      data: {
        status: 'PENDING',
        objectKey: proofKey,
      },
    });

    if (finalizedUpload.count !== 1) {
      throw new Error(
        '[upload-proof] No se pudo finalizar el registro del comprobante.',
      );
    }

    finalized = true;

    return NextResponse.json(
      { uploaded: true, width, height },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[upload-proof]', err);
    return NextResponse.json(
      { error: 'No pudimos subir el comprobante. Intenta con otra imagen o más tarde.' },
      { status: 500 },
    );
  } finally {
    // Cleanup: si el token fue reclamado pero no finalizado
    if (claimed && !finalized) {
      try {
        if (uploadedKey) {
          await deletePrivateProof(uploadedKey).catch(() => {
            /* best-effort */
          });
        }

        await prisma.paymentUpload.updateMany({
          where: {
            tokenHash,
            status: 'UPLOADING',
          },
          data: {
            status: 'PENDING',
            objectKey: null,
          },
        });
      } catch (cleanupErr) {
        console.error('[upload-proof] Fallo en cleanup del token:', cleanupErr);
      }
    }
  }
}
