import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

const promotionSchema = z.object({
  title:        z.string().min(1, 'El título es obligatorio.').max(200),
  subtitle:     z.string().max(300).optional().nullable(),
  discountText: z.string().max(100).optional().nullable(),
  imageUrl:     z.string().url('URL de imagen inválida.').max(500).optional().nullable(),
  bgColor:      z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color HEX inválido.')
    .optional()
    .default('#FFD700'),
  link:   z.string().max(500).optional().default('/productos'),
  active: z.boolean().optional().default(true),
  order:  z.number({ invalid_type_error: 'El orden debe ser un número.' }).int().min(0).max(9999).optional().default(1),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = promotionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos de la promoción inválidos.', errors: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const promo = await prisma.promotion.update({
      where: { id },
      data:  parsed.data,
    });
    return NextResponse.json(promo);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar la promoción.' }, { status: 500 });
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
    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar la promoción.' }, { status: 500 });
  }
}
