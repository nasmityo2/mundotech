import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(banner);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const banner = await prisma.banner.update({
      where: { id },
      data: {
        type:     body.type,
        imageUrl: body.imageUrl,
        title:    body.title    ?? null,
        subtitle: body.subtitle ?? null,
        label:    body.label    ?? null,
        ctaText:  body.ctaText  ?? null,
        tagText:  body.tagText  ?? null,
        link:     body.link     ?? '/productos',
        active:   body.active   ?? true,
        order:    body.order    ?? 0,
      },
    });
    return NextResponse.json(banner);
  } catch {
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
    await prisma.banner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
