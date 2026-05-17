import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

/**
 * Tipos de banner válidos según la UI del panel admin.
 * Actualizar aquí si se añaden nuevos tipos en el futuro.
 */
const BANNER_TYPES = [
  'hero',
  'ad_box',
  'cta_banner',
  'promo_large',
  'promo_small_1',
  'promo_small_2',
] as const;

const bannerSchema = z.object({
  type: z.enum(BANNER_TYPES, {
    message: `Tipo inválido. Valores permitidos: ${BANNER_TYPES.join(', ')}.`,
  }),
  imageUrl: z.string().url('URL de imagen inválida.').max(500),
  title:    z.string().max(200).optional().nullable(),
  subtitle: z.string().max(300).optional().nullable(),
  label:    z.string().max(100).optional().nullable(),
  ctaText:  z.string().max(100).optional().nullable(),
  tagText:  z.string().max(100).optional().nullable(),
  link:     z.string().max(500).optional().nullable().default('/productos'),
  active:   z.boolean().optional().default(true),
  order:    z.number({ message: 'El orden debe ser un número.' }).int().min(0).max(9999).optional().default(0),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAdmin();

  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) {
    return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  }

  // Público: solo banners activos (evita fuga si se adivina el id de un banner inactivo).
  // Admin puede ver cualquier registro para el panel / previas.
  if (!banner.active && !auth.authorized) {
    return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  }

  return NextResponse.json(banner);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bannerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos del banner inválidos.', errors: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const banner = await prisma.banner.update({
      where: { id },
      data:  parsed.data,
    });
    return NextResponse.json(banner);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el banner.' }, { status: 500 });
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
    await prisma.banner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar el banner.' }, { status: 500 });
  }
}
