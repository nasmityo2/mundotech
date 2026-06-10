import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin } from '@/lib/security';
import {
  reviewInputSchema,
  reviewToClient,
  getReviewSummary,
  getApprovedReviews,
  readReviewsAutoApprove,
  hasPurchasedProduct,
} from '@/lib/reviews';

/** GET /api/products/[id]/reviews — reseñas aprobadas + resumen (público). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [summary, reviews] = await Promise.all([
      getReviewSummary(id),
      getApprovedReviews(id),
    ]);
    return NextResponse.json(
      { summary, reviews },
      { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('[GET /api/products/[id]/reviews] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las reseñas.' }, { status: 500 });
  }
}

/** POST /api/products/[id]/reviews — crear reseña (requiere sesión). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (rateLimit(`reviews:post:ip:${ip}`, { limit: 8, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId || userId === 'guest') {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para dejar una reseña.' },
        { status: 401 }
      );
    }

    const { id: productId } = await params;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    const parsed = reviewInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de la reseña inválidos.', errors: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // Una reseña por usuario y producto.
    const existing = await prisma.review.findFirst({
      where: { productId, userId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya dejaste una reseña para este producto.' },
        { status: 409 }
      );
    }

    const data = parsed.data;
    const sessionName = (session.user?.name ?? '').trim();
    const authorName = (data.authorName?.trim() || sessionName || 'Cliente').slice(0, 60);

    const verifiedPurchase = await hasPurchasedProduct(prisma, userId, productId);
    const autoApprove = await readReviewsAutoApprove();

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        authorName,
        rating: data.rating,
        title: data.title?.trim() || null,
        comment: data.comment.trim(),
        verifiedPurchase,
        status: autoApprove ? 'APPROVED' : 'PENDING',
      },
    });

    return NextResponse.json(
      {
        review: reviewToClient(review),
        moderated: !autoApprove,
        message: autoApprove
          ? '¡Gracias por tu reseña!'
          : '¡Gracias! Tu reseña será publicada tras una breve revisión.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/products/[id]/reviews] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudo guardar la reseña.' }, { status: 500 });
  }
}
