import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

/**
 * PRD-041: mismo contrato Zod que el POST de /api/categories — antes este PUT
 * escribía el body crudo en Prisma (sin tipos ni límites).
 */
const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug inválido (minúsculas, números y guiones).'),
  imageUrl: z.string().max(600).nullish(),
  isFeatured: z.boolean().optional(),
  order: z.coerce.number().int().min(0).max(9999).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const parsed = categoryUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, slug, imageUrl, isFeatured, order } = parsed.data;
    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        imageUrl:   imageUrl ?? null,
        isFeatured: isFeatured ?? false,
        order:      order ?? 0,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    // PRD-043: logging del fallo (antes el catch tragaba el error).
    console.error('[PUT /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    // PRD-043: logging del fallo (antes el catch tragaba el error).
    console.error('[DELETE /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
