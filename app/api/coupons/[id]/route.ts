import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { couponInputSchema, couponToClient, normalizeCouponCode } from '@/lib/coupons';

/** PUT /api/coupons/[id] — actualizar cupón (admin). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = couponInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos del cupón inválidos.', errors: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const data = parsed.data;
    const code = normalizeCouponCode(data.code);

    // No permitir colisión de código con OTRO cupón.
    const clash = await prisma.coupon.findUnique({ where: { code } });
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { error: 'Ya existe otro cupón con ese código.' },
        { status: 409 }
      );
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchase: data.minPurchase ?? 0,
        maxDiscount: data.maxDiscount ?? null,
        maxUses: data.maxUses ?? null,
        perUserLimit: data.perUserLimit ?? null,
        startsAt: data.startsAt ?? null,
        expiresAt: data.expiresAt ?? null,
        active: data.active ?? true,
      },
    });
    return NextResponse.json(couponToClient(coupon));
  } catch (error) {
    console.error('[PUT /api/coupons/[id]] Error inesperado:', error);
    return NextResponse.json({ error: 'Error al actualizar el cupón.' }, { status: 500 });
  }
}

/** DELETE /api/coupons/[id] — eliminar cupón (admin). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/coupons/[id]] Error inesperado:', error);
    return NextResponse.json({ error: 'Error al eliminar el cupón.' }, { status: 500 });
  }
}
