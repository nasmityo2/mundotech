import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin, hashToken } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos

/**
 * POST /api/checkout/upload-session
 *
 * Genera un token de alta entropía para autorizar una subida de comprobante.
 * El token raw se devuelve una sola vez; en BD solo persiste SHA-256.
 * Expira en 30 minutos. El cliente debe enviarlo como header
 * `x-checkout-upload-token` al llamar a /api/checkout/upload-proof.
 *
 * Rate limit: 10 tokens por IP cada 10 minutos.
 */
export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (await rateLimit(`upload-session:ip:${ip}`, { limit: 10, windowMs: 10 * 60_000 })) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera unos minutos.' },
      { status: 429 },
    );
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.paymentUpload.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return NextResponse.json(
      { token: rawToken, expiresAt: expiresAt.toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[upload-session]', err);
    return NextResponse.json(
      { error: 'No pudimos iniciar la sesión de subida. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
