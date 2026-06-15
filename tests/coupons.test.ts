import { describe, expect, it, vi } from 'vitest';
import {
  COUPON_GENERIC_INVALID_REASON,
  COUPON_PER_USER_LIMIT_REASON,
  computeCouponDiscountUsd,
  couponInputSchema,
  validateCouponForCheckout,
} from '@/lib/coupons';

describe('computeCouponDiscountUsd', () => {
  it('aplica maxDiscount también a cupones FIXED', () => {
    const discount = computeCouponDiscountUsd(
      { discountType: 'FIXED', discountValue: 80, maxDiscount: 25 },
      100,
    );
    expect(discount).toBe(25);
  });

  it('mantiene el tope al subtotal (total nunca negativo)', () => {
    const discount = computeCouponDiscountUsd(
      { discountType: 'FIXED', discountValue: 50, maxDiscount: null },
      30,
    );
    expect(discount).toBe(30);
  });

  it('aplica maxDiscount en PERCENT como antes', () => {
    const discount = computeCouponDiscountUsd(
      { discountType: 'PERCENT', discountValue: 50, maxDiscount: 10 },
      100,
    );
    expect(discount).toBe(10);
  });
});

describe('couponInputSchema (FIX 3)', () => {
  const base = {
    code: 'TEST100',
    discountType: 'PERCENT' as const,
    discountValue: 10,
    active: true,
  };

  it('rechaza PERCENT 100% sin maxUses', () => {
    const parsed = couponInputSchema.safeParse({
      ...base,
      discountValue: 100,
      maxUses: null,
      perUserLimit: null,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const maxUsesIssue = parsed.error.issues.find((i) => i.path.includes('maxUses'));
      expect(maxUsesIssue?.message).toMatch(/100%|límite global/i);
    }
  });

  it('acepta PERCENT 100% con maxUses definido', () => {
    const parsed = couponInputSchema.safeParse({
      ...base,
      discountValue: 100,
      maxUses: 1,
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza descuento alto (>=50%) sin maxUses ni perUserLimit', () => {
    const parsed = couponInputSchema.safeParse({
      ...base,
      discountValue: 75,
      maxUses: null,
      perUserLimit: null,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes('maxUses'))).toBe(true);
    }
  });

  it('acepta descuento alto con perUserLimit', () => {
    const parsed = couponInputSchema.safeParse({
      ...base,
      discountValue: 75,
      maxUses: null,
      perUserLimit: 1,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('validateCouponForCheckout anti-enumeración (FIX 2)', () => {
  const activeCoupon = {
    id: 'c1',
    code: 'SECRET',
    active: true,
    discountType: 'PERCENT',
    discountValue: 10,
    minPurchase: 0,
    maxDiscount: null as number | null,
    maxUses: null as number | null,
    usedCount: 0,
    perUserLimit: null as number | null,
    startsAt: null as Date | null,
    expiresAt: null as Date | null,
  };

  function mockDb(coupon: typeof activeCoupon | null) {
    return {
      coupon: {
        findUnique: vi.fn().mockResolvedValue(coupon),
      },
      couponRedemption: {
        count: vi.fn().mockResolvedValue(0),
      },
    } as unknown as Parameters<typeof validateCouponForCheckout>[0];
  }

  it('devuelve el mismo mensaje genérico para cupón inexistente y expirado', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const missing = await validateCouponForCheckout(mockDb(null), 'NOEXISTE', 50, 'user-1');
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.reason).toBe(COUPON_GENERIC_INVALID_REASON);
    }

    const expired = await validateCouponForCheckout(
      mockDb({
        ...activeCoupon,
        expiresAt: new Date('2020-01-01'),
      }),
      'SECRET',
      50,
      'user-1',
    );
    expect(expired.ok).toBe(false);
    if (!expired.ok) {
      expect(expired.reason).toBe(COUPON_GENERIC_INVALID_REASON);
    }
    expect(expired.ok === false && missing.ok === false && expired.reason === missing.reason).toBe(
      true,
    );

    warnSpy.mockRestore();
  });

  it('mantiene mensaje específico para compra mínima', async () => {
    const result = await validateCouponForCheckout(
      mockDb({ ...activeCoupon, minPurchase: 100 }),
      'SECRET',
      50,
      'user-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/compra mínima/i);
      expect(result.reason).not.toBe(COUPON_GENERIC_INVALID_REASON);
    }
  });

  it('mantiene mensaje específico para perUserLimit alcanzado', async () => {
    const db = mockDb({ ...activeCoupon, perUserLimit: 1 });
    vi.mocked(db.couponRedemption.count).mockResolvedValue(1);

    const result = await validateCouponForCheckout(db, 'SECRET', 50, 'user-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(COUPON_PER_USER_LIMIT_REASON);
    }
  });

  it('rechaza invitado con perUserLimit usando mensaje genérico (FIX 4)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await validateCouponForCheckout(
      mockDb({ ...activeCoupon, perUserLimit: 1 }),
      'SECRET',
      50,
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(COUPON_GENERIC_INVALID_REASON);
    }

    warnSpy.mockRestore();
  });
});

describe('redeemCouponInTransaction perUserLimit (FIX 1c)', () => {
  it('lanza error si el conteo post-canje supera perUserLimit', async () => {
    const { redeemCouponInTransaction } = await import('@/lib/coupons');

    const tx = {
      couponRedemption: {
        count: vi
          .fn()
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(2),
      },
      coupon: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      couponRedemption_create: vi.fn(),
    };

    const createMock = vi.fn();
    Object.assign(tx.couponRedemption, { create: createMock });

    await expect(
      redeemCouponInTransaction(tx as never, {
        couponId: 'c1',
        maxUses: null,
        perUserLimit: 1,
        orderId: 'o1',
        userId: 'user-1',
        discountBs: 10,
      }),
    ).rejects.toThrow(COUPON_PER_USER_LIMIT_REASON);

    expect(createMock).toHaveBeenCalled();
  });
});
