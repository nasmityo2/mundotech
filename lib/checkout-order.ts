import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { loadExchangeRateUsdBsFromTx, roundMoney2 } from '@/lib/exchange-rate';
import type { OrderStatus } from '@/lib/definitions';
import { validateCouponForCheckout, redeemCouponInTransaction } from '@/lib/coupons';

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  imageUrl: z.string().optional().nullable(),
});

export const checkoutSchema = z
  .object({
    customerId: z.string().optional().default('guest'),
    customerName: z.string().min(1, 'El nombre del cliente es requerido.'),
    customerEmail: z.string().email().optional().nullable(),
    customerPhone: z.string().optional().nullable(),
    customerIdNumber: z.string().optional().nullable(),
    shippingDetails: z.object({
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().optional().default('N/A'),
      country: z.string().optional().default('Venezuela'),
    }),
    paymentMethod: z.enum(['Pago Móvil', 'Transferencia Bancaria', 'Binance Pay']),
    paymentBank: z.string().optional().nullable(),
    paymentHolderIdNumber: z.string().optional().nullable(),
    paymentHolderPhone: z.string().optional().nullable(),
    paymentReference: z.string().optional().nullable(),
    paymentProofUrl: z.string().min(1).optional().nullable(),
    couponCode: z.string().trim().max(40).optional().nullable(),
    items: z
      .array(orderItemSchema)
      .min(1, 'El pedido debe tener al menos un producto.')
      .max(50, 'El pedido supera el número máximo de líneas permitidas.'),
  })
  .superRefine((data, ctx) => {
    // Los tres métodos son de confirmación manual: el cliente paga por su cuenta
    // y debe aportar referencia + comprobante. La validación vive también en el
    // servidor para que un POST directo a /api/orders no pueda omitirlos.
    const isBinance = data.paymentMethod === 'Binance Pay';

    if (!data.paymentReference?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: isBinance
          ? 'Indica el Order ID o referencia que muestra Binance tras pagar.'
          : 'Indica el número de referencia del pago.',
        path: ['paymentReference'],
      });
    }
    if (!data.paymentProofUrl?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: isBinance
          ? 'Sube la captura de pantalla del pago en Binance.'
          : 'Sube el comprobante (captura) del pago.',
        path: ['paymentProofUrl'],
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CheckoutExecuteOptions = {
  /** Si true, crea el pedido pero no descuenta stock (espera aprobación admin). */
  deferStockDeduction?: boolean;
  /** Estado inicial del pedido (ej. verificación Binance). */
  orderStatus?: OrderStatus;
};

/** Recalcula total en servidor, crea pedido y opcionalmente descuenta stock. */
export async function executeCheckoutInTransaction(
  tx: Prisma.TransactionClient,
  input: CheckoutInput,
  options?: CheckoutExecuteOptions
) {
  const {
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    customerIdNumber,
    shippingDetails,
    paymentMethod,
    paymentBank,
    paymentHolderIdNumber,
    paymentHolderPhone,
    paymentReference,
    paymentProofUrl,
    couponCode,
    items,
  } = input;

  const deferStock = options?.deferStockDeduction ?? false;
  const orderStatus: OrderStatus = options?.orderStatus ?? 'Pendiente';

  const productIds = [...new Set(items.map((i) => i.productId))];
  const dbProducts = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, stock: true, name: true },
  });

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  // Cantidad TOTAL solicitada por producto (un mismo productId puede venir en
  // varias líneas; hay que sumarlas antes de comparar contra el stock).
  const quantityByProduct = new Map<string, number>();
  for (const item of items) {
    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + item.quantity
    );
  }

  for (const [productId, totalQty] of quantityByProduct) {
    const dbProduct = productMap.get(productId);
    if (!dbProduct) {
      throw new Error(`Producto "${productId}" no encontrado en el catálogo.`);
    }
    if (dbProduct.stock < totalQty) {
      throw new Error(
        `Stock insuficiente para "${dbProduct.name}". ` +
          `Solicitado: ${totalQty}, disponible: ${dbProduct.stock}.`
      );
    }
  }

  const rate = await loadExchangeRateUsdBsFromTx(tx);

  let serverTotal = 0;
  let subtotalUsd = 0;
  for (const item of items) {
    const p = productMap.get(item.productId)!;
    const unitVes = roundMoney2(p.price * rate);
    serverTotal += unitVes * item.quantity;
    subtotalUsd += p.price * item.quantity;
  }
  serverTotal = roundMoney2(serverTotal);
  subtotalUsd = roundMoney2(subtotalUsd);

  // Cupón: validar y calcular descuento SIEMPRE en el servidor (precios de BD).
  // Si el cupón dejó de ser válido entre el carrito y el commit, se aborta el
  // pedido para no cobrar de más sin avisar al cliente.
  let appliedCouponCode: string | null = null;
  let couponDiscountBs = 0;
  let couponToRedeem: { couponId: string; maxUses: number | null } | null = null;
  if (couponCode && couponCode.trim()) {
    const result = await validateCouponForCheckout(tx, couponCode, subtotalUsd, customerId ?? null);
    if (!result.ok) {
      throw new Error(`Cupón no válido: ${result.reason}`);
    }
    couponDiscountBs = Math.min(roundMoney2(result.discountUsd * rate), serverTotal);
    appliedCouponCode = result.coupon.code;
    couponToRedeem = { couponId: result.coupon.id, maxUses: result.coupon.maxUses };
  }

  const finalTotal = roundMoney2(serverTotal - couponDiscountBs);

  const isRegisteredUser = customerId && customerId !== 'guest';

  let resolvedCustomerEmail = customerEmail?.trim() || null;
  if (isRegisteredUser && !resolvedCustomerEmail) {
    const dbUser = await tx.user.findUnique({
      where: { id: customerId },
      select: { email: true },
    });
    resolvedCustomerEmail = dbUser?.email?.trim() || null;
  }

  const newOrder = await tx.order.create({
    data: {
      ...(isRegisteredUser ? { customer: { connect: { id: customerId } } } : {}),
      customerName,
      customerEmail: resolvedCustomerEmail,
      customerPhone: customerPhone ?? null,
      customerIdNumber: customerIdNumber ?? null,
      total: finalTotal,
      couponCode: appliedCouponCode,
      couponDiscount: couponDiscountBs > 0 ? couponDiscountBs : null,
      exchangeRateUsdBs: rate,
      status: orderStatus,
      paymentMethod,
      paymentBank: paymentBank ?? null,
      paymentHolderIdNumber: paymentHolderIdNumber ?? null,
      paymentHolderPhone: paymentHolderPhone ?? null,
      paymentReference: paymentReference ?? null,
      paymentProofUrl: paymentProofUrl ?? null,
      shippingAddress: shippingDetails.address,
      shippingCity: shippingDetails.city,
      shippingState: shippingDetails.state,
      shippingZipCode: shippingDetails.zipCode,
      shippingCountry: shippingDetails.country,
      items: {
        create: items.map((item) => {
          const p = productMap.get(item.productId)!;
          const unitVes = roundMoney2(p.price * rate);
          return {
            productId: item.productId,
            productName: p.name,
            quantity: item.quantity,
            price: unitVes,
            imageUrl: item.imageUrl ?? null,
          };
        }),
      },
    },
    include: { items: true },
  });

  // Canje atómico del cupón (incrementa usedCount respetando maxUses) tras crear
  // el pedido, dentro de la misma transacción.
  if (couponToRedeem) {
    await redeemCouponInTransaction(tx, {
      couponId: couponToRedeem.couponId,
      maxUses: couponToRedeem.maxUses,
      orderId: newOrder.id,
      userId: customerId ?? null,
      discountBs: couponDiscountBs,
    });
  }

  if (!deferStock) {
    // Decremento atómico por producto usando la cantidad TOTAL agregada, una sola
    // vez por productId (no por línea), con guard `stock >= cantidad` para evitar
    // condiciones de carrera con otros checkouts concurrentes.
    for (const [productId, totalQty] of quantityByProduct) {
      const result = await tx.product.updateMany({
        where: { id: productId, stock: { gte: totalQty } },
        data: { stock: { decrement: totalQty } },
      });
      if (result.count === 0) {
        const p = productMap.get(productId)!;
        throw new Error(
          `Stock insuficiente para "${p.name}" al confirmar la compra. ` +
            `Otro pedido puede haber reservado las últimas unidades.`
        );
      }
    }
  }

  return newOrder;
}

/**
 * Devuelve al inventario las unidades de un pedido cuyo stock fue descontado en
 * el checkout (todos los métodos descuentan stock al confirmar). Usa `updateMany`
 * por producto para no fallar si algún producto fue eliminado del catálogo.
 *
 * Debe llamarse SOLO al cancelar/eliminar un pedido que aún no fue entregado y
 * que no estaba ya cancelado, para evitar restaurar inventario por duplicado.
 */
export async function restoreOrderStockInTransaction(
  tx: Prisma.TransactionClient,
  items: { productId: string; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    await tx.product.updateMany({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

/**
 * ¿Debe restaurarse el stock al pasar `from` → `to`?
 * Sí cuando se cancela un pedido cuyo inventario seguía reservado:
 * cualquier estado distinto de "Cancelado" (idempotencia) y de "Entregado"
 * (la mercancía ya está con el cliente).
 */
export function shouldRestoreStockOnCancel(
  from: OrderStatus | string,
  to: OrderStatus | string
): boolean {
  return to === 'Cancelado' && from !== 'Cancelado' && from !== 'Entregado';
}
