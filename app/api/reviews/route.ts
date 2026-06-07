import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { reviewToClient, readReviewsAutoApprove } from '@/lib/reviews';
import { VALID_REVIEW_STATUSES, type ReviewStatus } from '@/lib/definitions';

/** GET /api/reviews?status=PENDING|APPROVED|REJECTED|all — listado admin. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const where =
      statusParam && VALID_REVIEW_STATUSES.includes(statusParam as ReviewStatus)
        ? { status: statusParam }
        : {};

    const [reviews, counts, autoApprove] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true } } },
        take: 300,
      }),
      prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
      readReviewsAutoApprove(),
    ]);

    const countMap: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const c of counts) countMap[c.status] = c._count._all;

    return NextResponse.json(
      { reviews: reviews.map(reviewToClient), counts: countMap, autoApprove },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[GET /api/reviews] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las reseñas.' }, { status: 500 });
  }
}
