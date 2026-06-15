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

  it('traduce P2002 del índice parcial a COUPON_PER_USER_LIMIT_REASON (409)', async () => {
    const { Prisma } = await import('@prisma/client');
    const { redeemCouponInTransaction } = await import('@/lib/coupons');

    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    const tx = {
      couponRedemption: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockRejectedValue(p2002),
      },
      coupon: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(
      redeemCouponInTransaction(tx as never, {
        couponId: 'c1',
        maxUses: null,
        perUserLimit: 1,
        orderId: 'o2',
        userId: 'user-1',
        discountBs: 10,
      }),
    ).rejects.toThrow(COUPON_PER_USER_LIMIT_REASON);
  });

  type MockRedemption = {
    id: string;
    couponId: string;
    userId: string | null;
    orderId: string;
    perUserSlot: number | null;
    revertedAt: Date | null;
  };

  function createPerUserLimitTx() {
    const redemptions: MockRedemption[] = [];
    let nextId = 1;

    return {
      redemptions,
      tx: {
        couponRedemption: {
          count: vi.fn(async ({ where }: { where: { couponId: string; userId: string; revertedAt: null } }) =>
            redemptions.filter(
              (r) =>
                r.couponId === where.couponId &&
                r.userId === where.userId &&
                r.revertedAt === where.revertedAt,
            ).length,
          ),
          create: vi.fn(async ({ data }: { data: Omit<MockRedemption, 'id' | 'revertedAt'> }) => {
            const slotTaken = redemptions.some(
              (r) =>
                r.couponId === data.couponId &&
                r.userId === data.userId &&
                r.perUserSlot === data.perUserSlot &&
                r.revertedAt === null,
            );
            if (slotTaken) {
              const { Prisma } = await import('@prisma/client');
              throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: 'test',
              });
            }
            redemptions.push({ ...data, id: `r-${nextId++}`, revertedAt: null });
          }),
          update: vi.fn(async ({ where, data }: { where: { id: string }; data: { revertedAt: Date } }) => {
            const row = redemptions.find((r) => r.id === where.id);
            if (row) row.revertedAt = data.revertedAt;
          }),
          findUnique: vi.fn(async ({ where }: { where: { orderId: string } }) => {
            const row = redemptions.find((r) => r.orderId === where.orderId);
            return row
              ? { id: row.id, couponId: row.couponId, revertedAt: row.revertedAt }
              : null;
          }),
        },
        coupon: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      },
    };
  }

  it('perUserLimit=1: canjear → revertir → volver a canjear reutiliza el slot', async () => {
    const { redeemCouponInTransaction, revertCouponRedemptionInTransaction } =
      await import('@/lib/coupons');
    const { tx } = createPerUserLimitTx();

    await redeemCouponInTransaction(tx as never, {
      couponId: 'c1',
      maxUses: null,
      perUserLimit: 1,
      orderId: 'o-first',
      userId: 'user-1',
      discountBs: 10,
    });

    await revertCouponRedemptionInTransaction(tx as never, 'o-first');

    await expect(
      redeemCouponInTransaction(tx as never, {
        couponId: 'c1',
        maxUses: null,
        perUserLimit: 1,
        orderId: 'o-second',
        userId: 'user-1',
        discountBs: 10,
      }),
    ).resolves.toBeUndefined();
  });

  it('10 canjes concurrentes: exactamente 1 ok y 9 con límite por usuario', async () => {
    const { Prisma } = await import('@prisma/client');
    const { redeemCouponInTransaction } = await import('@/lib/coupons');

    let activeRedemptions = 0;

    const tx = {
      couponRedemption: {
        count: vi.fn(async () => activeRedemptions),
        create: vi.fn(async ({ data }: { data: { orderId: string } }) => {
          await new Promise((r) => setTimeout(r, 5));
          if (activeRedemptions >= 1) {
            throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: 'test',
            });
          }
          activeRedemptions += 1;
          return data;
        }),
      },
      coupon: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const attempts = Array.from({ length: 10 }, (_, i) =>
      redeemCouponInTransaction(tx as never, {
        couponId: 'c1',
        maxUses: null,
        perUserLimit: 1,
        orderId: `o-${i}`,
        userId: 'user-1',
        discountBs: 10,
      }),
    );

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);
    for (const r of rejected) {
      expect(r.status).toBe('rejected');
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(Error);
        expect((r.reason as Error).message).toBe(COUPON_PER_USER_LIMIT_REASON);
      }
    }
  });
});
