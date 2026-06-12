import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { reviewToClient, readReviewsAutoApprove } from '@/lib/reviews';
import { VALID_REVIEW_STATUSES, type ReviewStatus } from '@/lib/definitions';

/**
 * GET /api/reviews?status=PENDING|APPROVED|REJECTED|all&page=1&pageSize=50
 * Listado admin.
 * PRD-163: soporta paginación (`page` ≥ 1, `pageSize` 1–300) y devuelve
 * `total`/`page`/`pageSize`. Sin parámetros mantiene el comportamiento previo
 * (primeras 300) para no romper la UI admin actual (propiedad del segmento 05).
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    // PRD-122 (segmento 03): Review.status ahora es enum en Prisma — narrow al
    // union ReviewStatus (mismos literales) tras validar contra la whitelist.
    const statusFilter =
      statusParam && VALID_REVIEW_STATUSES.includes(statusParam as ReviewStatus)
        ? (statusParam as ReviewStatus)
        : null;
    const where = statusFilter ? { status: statusFilter } : {};

    const pageParam = Number.parseInt(searchParams.get('page') ?? '', 10);
    const sizeParam = Number.parseInt(searchParams.get('pageSize') ?? '', 10);
    const paginated = Number.isFinite(pageParam) && pageParam >= 1;
    const page = paginated ? pageParam : 1;
    const pageSize = Number.isFinite(sizeParam)
      ? Math.min(300, Math.max(1, sizeParam))
      : paginated
        ? 50
        : 300;

    const [reviews, total, counts, autoApprove] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
      readReviewsAutoApprove(),
    ]);

    const countMap: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const c of counts) countMap[c.status] = c._count._all;

    return NextResponse.json(
      {
        reviews: reviews.map(reviewToClient),
        counts: countMap,
        autoApprove,
        total,
        page,
        pageSize,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[GET /api/reviews] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las reseñas.' }, { status: 500 });
  }
}
