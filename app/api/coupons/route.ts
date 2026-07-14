import { NextResponse } from 'next/server';
import { logError } from '@/lib/safe-logger';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/admin-access-server';
import { couponInputSchema, couponToClient, normalizeCouponCode } from '@/lib/coupons';
import { rejectInvalidMutationOrigin } from '@/lib/security';

/** GET /api/coupons — listado admin de todos los cupones. */
export async function GET() {
  const auth = await requirePermission('PROMOTIONS');
  if (!auth.authorized) return auth.response;

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(coupons.map(couponToClient), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logError('coupons_get_failed', error, { route: '/api/coupons' });
    return NextResponse.json({ error: 'Error al obtener los cupones.' }, { status: 500 });
  }
}

/** POST /api/coupons — crear cupón (admin). */
export async function POST(request: Request) {
  const originCheck = rejectInvalidMutationOrigin(request);
  if (originCheck) return originCheck;

  const auth = await requirePermission('PROMOTIONS');
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    const parsed = couponInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos del cupón inválidos.', errors: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const data = parsed.data;
    const code = normalizeCouponCode(data.code);

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un cupón con ese código.' },
        { status: 409 }
      );
    }

    const coupon = await prisma.coupon.create({
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
    return NextResponse.json(couponToClient(coupon), { status: 201 });
  } catch (error) {
    logError('coupons_post_failed', error, { route: '/api/coupons' });
    return NextResponse.json({ error: 'Error al crear el cupón.' }, { status: 500 });
  }
}
