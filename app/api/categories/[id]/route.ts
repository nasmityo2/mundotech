import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { saveSlugRedirect } from '@/lib/slug-redirects';

/**
 * PRD-041: mismo contrato Zod que el POST de /api/categories — antes este PUT
 * escribía el body crudo en Prisma (sin tipos ni límites).
 * P85: añadidos description y seoTitle (opcionales, texto plano, sin HTML).
 */
const categoryUpdateSchema = z.object({
  name:        z.string().trim().min(1).max(80),
  slug:        z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug inválido (minúsculas, números y guiones).'),
  imageUrl:    z.string().max(600).nullish(),
  isFeatured:  z.boolean().optional(),
  order:       z.coerce.number().int().min(0).max(9999).optional(),
  // P85: campos SEO opcionales — texto plano (sin HTML). Null = usar fallbacks.
  description:      z.string().trim().max(300, 'Descripción: máximo 300 caracteres.').nullish(),
  seoTitle:         z.string().trim().max(70, 'Título SEO: máximo 70 caracteres.').nullish(),
  // TODO-MC-01 (cerrado): override de categoría Google; null = usar mapa automático.
  googleCategoryId: z.number().int().positive().nullish(),
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
    const { name, slug, imageUrl, isFeatured, order, description, seoTitle, googleCategoryId } = parsed.data;

    // PRD-066 / DEPENDENCIA-05: capture slug BEFORE update to detect renames.
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { slug: true },
    });
    const slugChanged = !!existing && existing.slug !== slug;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        imageUrl:         imageUrl         ?? null,
        isFeatured:       isFeatured       ?? false,
        order:            order            ?? 0,
        description:      description      ?? null,
        seoTitle:         seoTitle         ?? null,
        googleCategoryId: googleCategoryId ?? null,
      },
    });

    // PRD-066: persist old→new slug redirect so /categoria/{oldSlug} returns 301.
    // Chain-flattening and cycle prevention are handled inside saveSlugRedirect.
    if (slugChanged && existing) {
      await saveSlugRedirect(existing.slug, slug);
      revalidatePath(`/categoria/${existing.slug}`, 'page');
    }
    revalidatePath('/categoria/[slug]', 'page');
    revalidateTag('categories', 'default');
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
    revalidateTag('categories', 'default');
    return NextResponse.json({ success: true });
  } catch (error) {
    // PRD-043: logging del fallo (antes el catch tragaba el error).
    console.error('[DELETE /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
