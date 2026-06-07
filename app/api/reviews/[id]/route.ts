import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { reviewToClient } from '@/lib/reviews';
import { VALID_REVIEW_STATUSES } from '@/lib/definitions';

const patchSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  adminReply: z.string().trim().max(1000).optional().nullable(),
});

/** PATCH /api/reviews/[id] — moderar reseña (estado y/o respuesta). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
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
    return NextResponse.json(reviewToClient(review));
  } catch (error) {
    console.error('[PATCH /api/reviews/[id]] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la reseña.' }, { status: 500 });
  }
}

/** DELETE /api/reviews/[id] — eliminar reseña (admin). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/reviews/[id]] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudo eliminar la reseña.' }, { status: 500 });
  }
}
