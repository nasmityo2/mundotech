import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { isAdminRole } from '@/lib/api-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin } from '@/lib/security';
import { reviewToClient, reviewInputSchema, readReviewsAutoApprove } from '@/lib/reviews';
import { VALID_REVIEW_STATUSES } from '@/lib/definitions';

/** Invalida la ficha pública del producto tras moderar/editar/borrar una reseña. */
async function revalidateProductReviews(productId: string) {
  try {
    const prod = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    // PRD-107: hay que pasar el slug REAL, no la ruta literal '/product/[slug]'.
    revalidatePath(`/product/${prod?.slug ?? productId}`);
  } catch (e) {
    console.error('[reviews] revalidateProductReviews falló:', e);
  }
}

const adminPatchSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  adminReply: z.string().trim().max(1000).optional().nullable(),
});

/** PRD-162: el autor solo puede editar el contenido de SU reseña. */
const authorPatchSchema = reviewInputSchema.pick({
  rating: true,
  title: true,
  comment: true,
  photos: true,
});

/**
 * PATCH /api/reviews/[id]
 * - Admin: moderación (estado y/o respuesta) — comportamiento original.
 * - Autor (PRD-162): edita rating/título/comentario de su propia reseña.
 *   La edición vuelve a moderación salvo auto-approve + compra verificada.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || userId === 'guest') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const isAdmin = isAdminRole((session?.user as { role?: string } | undefined)?.role);

  // ── Rama admin: moderación (sin cambios de comportamiento) ────────────────
  if (isAdmin) {
    const parsed = adminPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos.', errors: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { status, adminReply } = parsed.data;
    if (status && !VALID_REVIEW_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Estado de reseña no válido.' }, { status: 400 });
    }

    try {
      const review = await prisma.review.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(adminReply !== undefined ? { adminReply: adminReply?.trim() || null } : {}),
        },
      });
      await revalidateProductReviews(review.productId);
      return NextResponse.json(reviewToClient(review));
    } catch (error) {
      console.error('[PATCH /api/reviews/[id]] Error inesperado:', error);
      return NextResponse.json({ error: 'No se pudo actualizar la reseña.' }, { status: 500 });
    }
  }

  // ── Rama autor (PRD-162) ───────────────────────────────────────────────────
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }
  const ip = getClientIp(request);
  if (await rateLimit(`reviews:author-edit:${ip}`, { limit: 8, windowMs: 60_000 })) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 });
  }

  const parsed = authorPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos de la reseña inválidos.', errors: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const existing = await prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true, verifiedPurchase: true },
    });
    // 403 genérico: no revelar existencia de recursos ajenos (anti-enumeración).
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const autoApprove = await readReviewsAutoApprove();
    const approved = autoApprove && existing.verifiedPurchase;

    const review = await prisma.review.update({
      where: { id },
      data: {
        rating: parsed.data.rating,
        title: parsed.data.title?.trim() || null,
        comment: parsed.data.comment.trim(),
        photos: parsed.data.photos ?? [],
        // La edición re-modera con la misma regla que la creación (PRD-161).
        status: approved ? 'APPROVED' : 'PENDING',
      },
    });

    await revalidateProductReviews(review.productId);

    return NextResponse.json({
      review: reviewToClient(review),
      moderated: !approved,
      message: approved
        ? 'Reseña actualizada.'
        : 'Reseña actualizada. Será visible tras una breve revisión.',
    });
  } catch (error) {
    console.error('[PATCH /api/reviews/[id]][autor] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la reseña.' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/[id]
 * - Admin: elimina cualquier reseña (comportamiento original).
 * - Autor (PRD-162): elimina su propia reseña.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || userId === 'guest') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = isAdminRole((session?.user as { role?: string } | undefined)?.role);

  try {
    if (isAdmin) {
      const target = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
      if (!target) {
        return NextResponse.json({ success: true });
      }
      await prisma.review.deleteMany({ where: { id } });
      await revalidateProductReviews(target.productId);
      return NextResponse.json({ success: true });
    }

    // ── Rama autor (PRD-162) ──────────────────────────────────────────────
    if (!verifySameOrigin(request)) {
      return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
    }
    const ip = getClientIp(request);
    if (await rateLimit(`reviews:author-delete:${ip}`, { limit: 8, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 });
    }

    const existing = await prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true, productId: true },
    });
    if (!existing) {
      return NextResponse.json({ success: true });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    await prisma.review.deleteMany({ where: { id, userId } });
    await revalidateProductReviews(existing.productId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/reviews/[id]] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la reseña.' }, { status: 500 });
  }
}
