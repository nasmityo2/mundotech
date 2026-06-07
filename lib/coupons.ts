/**
 * coupons.ts
 * Lógica de cupones de descuento: validación server-side, cálculo de descuento y
 * canje atómico. Regla financiera (R-checkout): el descuento SIEMPRE se calcula en
 * el servidor a partir de precios de BD; el cliente nunca fija el monto.
 */
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Coupon as CouponClient, CouponDiscountType } from '@/lib/definitions';
import { roundMoney2 } from '@/lib/exchange-rate';

/** Cliente Prisma o cliente de transacción: ambos exponen los modelos necesarios. */
type DbClient = Prisma.TransactionClient;

/** Normaliza el código: mayúsculas, sin espacios. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

/** Acepta '' / null como null; coacciona strings ISO o datetime-local a Date. */
const optionalDate = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.coerce.date().nullable(),
);

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, 'El código debe tener al menos 2 caracteres.')
      .max(40, 'El código es demasiado largo.'),
    description: z.string().max(200).optional().nullable(),
    discountType: z.enum(['PERCENT', 'FIXED']),
    discountValue: z.number().positive('El valor del descuento debe ser mayor que 0.'),
    minPurchase: z.number().min(0).optional().default(0),
    maxDiscount: z.number().positive().optional().nullable(),
    maxUses: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().optional().nullable(),
    startsAt: optionalDate.optional(),
    expiresAt: optionalDate.optional(),
    active: z.boolean().optional().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.discountType === 'PERCENT' && d.discountValue > 100) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un descuento porcentual no puede superar 100%.',
        path: ['discountValue'],
      });
    }
    if (d.startsAt && d.expiresAt && d.startsAt > d.expiresAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'La fecha de inicio no puede ser posterior a la de expiración.',
        path: ['expiresAt'],
      });
    }
  });

export type CouponInput = z.infer<typeof couponInputSchema>;

/** Mapea un registro Prisma de Coupon al tipo de UI. */
export function couponToClient(c: {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchase: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
  createdAt: Date;
}): CouponClient {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discountType as CouponDiscountType,
    discountValue: c.discountValue,
    minPurchase: c.minPurchase,
    maxDiscount: c.maxDiscount,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
  };
}

/**
 * Descuento en USD para un subtotal dado. Función pura: el servidor la usa con
 * `subtotalUsd` calculado desde precios de BD. Nunca excede el subtotal.
 */
export function computeCouponDiscountUsd(
  coupon: { discountType: string; discountValue: number; maxDiscount: number | null },
  subtotalUsd: number,
): number {
  let discount = 0;
  if (coupon.discountType === 'PERCENT') {
    discount = subtotalUsd * (coupon.discountValue / 100);
    if (coupon.maxDiscount != null && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.discountValue;
  }
  discount = Math.min(discount, subtotalUsd);
  return roundMoney2(Math.max(0, discount));
}

export type ValidatedCoupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
};

export type CouponValidationResult =
  | { ok: true; coupon: ValidatedCoupon; discountUsd: number }
  | { ok: false; reason: string };

/**
 * Valida un cupón contra el subtotal (USD) y el usuario. NO incrementa usos
 * (eso lo hace `redeemCouponInTransaction` de forma atómica al confirmar).
 */
export async function validateCouponForCheckout(
  db: DbClient,
  rawCode: string,
  subtotalUsd: number,
  userId: string | null,
): Promise<CouponValidationResult> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false, reason: 'Ingresa un código de cupón.' };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    return { ok: false, reason: 'El cupón no existe o no está disponible.' };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, reason: 'Este cupón aún no está activo.' };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, reason: 'Este cupón ya expiró.' };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: 'Este cupón alcanzó su límite de usos.' };
  }
  if (subtotalUsd + 0.0001 < coupon.minPurchase) {
    return {
      ok: false,
      reason: `Requiere una compra mínima de $${coupon.minPurchase.toFixed(2)}.`,
    };
  }
  if (coupon.perUserLimit != null && userId && userId !== 'guest') {
    const used = await db.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (used >= coupon.perUserLimit) {
      return { ok: false, reason: 'Ya usaste este cupón el máximo de veces permitido.' };
    }
  }

  const discountUsd = computeCouponDiscountUsd(coupon, subtotalUsd);
  if (discountUsd <= 0) {
    return { ok: false, reason: 'El cupón no genera descuento para este pedido.' };
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
    },
    discountUsd,
  };
}

/**
 * Incrementa `usedCount` de forma atómica (respeta `maxUses`) y registra el canje.
 * Debe ejecutarse DENTRO de la transacción de creación del pedido.
 */
export async function redeemCouponInTransaction(
  tx: Prisma.TransactionClient,
  params: {
    couponId: string;
    maxUses: number | null;
    orderId: string;
    userId: string | null;
    discountBs: number;
  },
): Promise<void> {
  const { couponId, maxUses, orderId, userId, discountBs } = params;
  const res = await tx.coupon.updateMany({
    where: maxUses != null ? { id: couponId, usedCount: { lt: maxUses } } : { id: couponId },
    data: { usedCount: { increment: 1 } },
  });
  if (res.count === 0) {
    throw new Error('El cupón alcanzó su límite de usos al confirmar el pedido.');
  }
  await tx.couponRedemption.create({
    data: {
      couponId,
      orderId,
      userId: userId && userId !== 'guest' ? userId : null,
      discount: roundMoney2(discountBs),
    },
  });
}
