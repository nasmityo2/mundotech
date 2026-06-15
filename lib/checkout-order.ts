import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { loadExchangeRateUsdBsFromTx, roundMoney2 } from '@/lib/exchange-rate';
import type { OrderStatus } from '@/lib/definitions';
import { CheckoutError } from '@/lib/checkout-error';
import { d } from '@/lib/decimal';
import {
  validateCouponForCheckout,
  redeemCouponInTransaction,
  revertCouponRedemptionInTransaction,
  COUPON_PER_USER_LIMIT_REASON,
  COUPON_GENERIC_INVALID_REASON,
} from '@/lib/coupons';
import { isTrustedPaymentProofUrl } from '@/lib/payment-proof';

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
    /**
     * PRD-128: cómo retira el cliente. Para 'tienda' el servidor reemplaza la
     * dirección por la configurada en readSettings() (nunca el copy del cliente).
     */
    shippingMethod: z.enum(['tienda', 'mrw']).optional().nullable(),
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
    paymentProofUrl: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val?.trim() || z.string().url().safeParse(val.trim()).success, {
        message: 'Comprobante inválido',
      })
      .refine((val) => !val?.trim() || isTrustedPaymentProofUrl(val.trim()), {
        message: 'El comprobante de pago debe provenir del almacenamiento autorizado.',
      }),
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
  /** Estado inicial del pedido (ej. verificación Binance). */
  orderStatus?: OrderStatus;
};

/**
 * PRD-131: busca un pedido reciente equivalente (mismo comprador + misma
 * referencia de pago, no cancelado) para tratar reintentos/doble envío como
 * idempotentes. Una misma transferencia no puede pagar dos pedidos distintos,
 * así que la referencia funciona como clave natural de idempotencia.
 * Debe ejecutarse DENTRO de la misma transacción que crea el pedido.
 * // DEPENDENCIA-03 (PRD-131): la garantía total exige índice único
 * // (customerId, paymentReference) o columna idempotencyKey en schema.prisma.
 */
export async function findRecentDuplicateOrderInTransaction(
  tx: Prisma.TransactionClient,
  params: { customerId: string | null; paymentReference: string | null | undefined },
) {
  const reference = params.paymentReference?.trim();
  if (!reference || !params.customerId || params.customerId === 'guest') return null;

  return tx.order.findFirst({
    where: {
      customerId: params.customerId,
      paymentReference: reference,
      status: { not: 'Cancelado' satisfies OrderStatus },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** Recalcula total en servidor, crea pedido y descuenta stock atómicamente. */
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

  const orderStatus: OrderStatus = options?.orderStatus ?? 'Pendiente';

  const productIds = [...new Set(items.map((i) => i.productId))];
  // PRD-025: se incluye isActive en la consulta para detectar productos
  // despublicados/soft-deleted y rechazar el pedido con mensaje claro.
  const dbProducts = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, stock: true, name: true, isActive: true },
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
      throw new CheckoutError(
        'Uno de los productos de tu carrito ya no está disponible en el catálogo.',
        404
      );
    }
    // PRD-025: rechazar productos despublicados (soft-deleted) antes de descontar
    // stock o calcular totales. El mensaje nombra el producto para que el cliente
    // pueda retirarlo del carrito y completar la compra con el resto.
    if (!dbProduct.isActive) {
      throw new CheckoutError(
        `"${dbProduct.name}" ya no está disponible en el catálogo. ` +
          'Por favor retíralo de tu carrito e intenta de nuevo.',
        404
      );
    }
    if (dbProduct.stock < totalQty) {
      throw new CheckoutError(
        `Stock insuficiente para "${dbProduct.name}". ` +
          `Solicitado: ${totalQty}, disponible: ${dbProduct.stock}.`,
        409
      );
    }
  }

  const rate = await loadExchangeRateUsdBsFromTx(tx);

  // Política de redondeo (PRD-201): el precio unitario se congela en Bs con 2
  // decimales y el total del pedido es EXACTAMENTE la suma de las líneas
  // (precio_línea × cantidad), acumulada en céntimos enteros para evitar
  // deriva de coma flotante. Así sum(items) === Order.total siempre.
  let totalCents = 0;
  let subtotalUsd = 0;
  for (const item of items) {
    const p = productMap.get(item.productId)!;
    // PRD-204: p.price es Decimal en BD — convertir a number antes de aritmética.
    const priceNum = d(p.price);
    const unitVes = roundMoney2(priceNum * rate);
    totalCents += Math.round(unitVes * 100) * item.quantity;
    subtotalUsd += priceNum * item.quantity;
  }
  const serverTotal = totalCents / 100;
  subtotalUsd = roundMoney2(subtotalUsd);

  const isRegisteredUser = customerId && customerId !== 'guest';

  let resolvedCustomerEmail = customerEmail?.trim() || null;
  if (isRegisteredUser && !resolvedCustomerEmail) {
    const dbUser = await tx.user.findUnique({
      where: { id: customerId },
      select: { email: true },
    });
    resolvedCustomerEmail = dbUser?.email?.trim() || null;
  }

  // Cupón: validar y calcular descuento SIEMPRE en el servidor (precios de BD).
  // Si el cupón dejó de ser válido entre el carrito y el commit, se aborta el
  // pedido para no cobrar de más sin avisar al cliente (PRD-132: el canje
  // atómico posterior re-verifica maxUses dentro de esta misma transacción).
  let appliedCouponCode: string | null = null;
  let couponDiscountCents = 0;
  let couponToRedeem: {
    couponId: string;
    maxUses: number | null;
    perUserLimit: number | null;
  } | null = null;
  if (couponCode && couponCode.trim()) {
    const result = await validateCouponForCheckout(
      tx,
      couponCode,
      subtotalUsd,
      customerId ?? null,
      resolvedCustomerEmail
    );
    if (!result.ok) {
      const status = result.reason === COUPON_PER_USER_LIMIT_REASON ? 409 : 400;
      throw new CheckoutError(`Cupón no válido: ${result.reason}`, status);
    }
    couponDiscountCents = Math.min(Math.round(roundMoney2(result.discountUsd * rate) * 100), totalCents);
    appliedCouponCode = result.coupon.code;
    couponToRedeem = {
      couponId: result.coupon.id,
      maxUses: result.coupon.maxUses,
      perUserLimit: result.coupon.perUserLimit,
    };
  }

  const couponDiscountBs = couponDiscountCents / 100;
  const finalTotal = (totalCents - couponDiscountCents) / 100;

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
          const unitVes = roundMoney2(d(p.price) * rate);
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
    try {
      await redeemCouponInTransaction(tx, {
        couponId: couponToRedeem.couponId,
        maxUses: couponToRedeem.maxUses,
        perUserLimit: couponToRedeem.perUserLimit,
        orderId: newOrder.id,
        userId: customerId ?? null,
        discountBs: couponDiscountBs,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === COUPON_PER_USER_LIMIT_REASON) {
        throw new CheckoutError(`Cupón no válido: ${msg}`, 409);
      }
      if (msg === COUPON_GENERIC_INVALID_REASON) {
        throw new CheckoutError(`Cupón no válido: ${msg}`, 409);
      }
      throw err;
    }
  }

  // Decremento atómico por producto usando la cantidad TOTAL agregada, una sola
  // vez por productId (no por línea), con guard `stock >= cantidad` para evitar
  // condiciones de carrera con otros checkouts concurrentes.
  // (PRD-068: el modo deferStockDeduction fue eliminado — era código muerto;
  // Binance también descuenta stock aquí, en el checkout.)
  for (const [productId, totalQty] of quantityByProduct) {
    const result = await tx.product.updateMany({
      where: { id: productId, stock: { gte: totalQty } },
      data: { stock: { decrement: totalQty } },
    });
    if (result.count === 0) {
      const p = productMap.get(productId)!;
      throw new CheckoutError(
        `Stock insuficiente para "${p.name}" al confirmar la compra. ` +
          `Otro pedido puede haber reservado las últimas unidades.`,
        409
      );
    }
  }

  return newOrder;
}

/**
 * Devuelve al inventario las unidades de un pedido cuyo stock fue descontado en
 * el checkout (todos los métodos descuentan stock al confirmar). Usa `updateMany`
 * por producto para no fallar si algún producto fue eliminado del catálogo.
 *
 * Debe llamarse SOLO al cancelar/eliminar un pedido cuyo inventario seguía
 * reservado (ver `shouldRestoreStockOnCancel`), para evitar restauraciones
 * duplicadas o de mercancía ya despachada.
 */
export async function restoreOrderStockInTransaction(
  tx: Prisma.TransactionClient,
  items: { productId: string; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    const result = await tx.product.updateMany({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
    if (result.count === 0) {
      // PRD-218: el producto fue eliminado del catálogo — la cancelación no puede
      // devolver estas unidades. Se registra para auditoría de inventario.
      // DEPENDENCIA-05 (PRD-231): deleteProductAction debería bloquear/avisar al
      // eliminar productos con pedidos abiertos.
      console.warn(
        `[restore-stock] Producto ${item.productId} ya no existe; no se restauraron ${item.quantity} unidades.`
      );
    }
  }
}

/**
 * Efectos colaterales de cancelar un pedido, en UNA transacción:
 *  - restaura stock si el estado de origen lo amerita (`shouldRestoreStockOnCancel`),
 *  - revierte el canje del cupón (PRD-190) para que `usedCount` y el límite por
 *    usuario vuelvan a estar disponibles.
 * Usar en TODA ruta que cancele o elimine pedidos.
 */
export async function applyOrderCancellationEffectsInTransaction(
  tx: Prisma.TransactionClient,
  order: { id: string; status: OrderStatus | string; items: { productId: string; quantity: number }[] }
): Promise<void> {
  if (shouldRestoreStockOnCancel(order.status, 'Cancelado')) {
    await restoreOrderStockInTransaction(tx, order.items);
  }
  await revertCouponRedemptionInTransaction(tx, order.id);
}

/**
 * Estados cuyo inventario sigue reservado dentro de la tienda: cancelar desde
 * aquí SÍ devuelve unidades al stock.
 */
const STOCK_RESTORABLE_FROM: readonly OrderStatus[] = [
  'Pendiente verificación Binance',
  'Pendiente',
  'En Proceso',
];

/**
 * ¿Debe restaurarse el stock al pasar `from` → `to`?
 *
 * PRD-002: SOLO se restaura cuando el pedido aún no salió de la tienda
 * (`Pendiente verificación Binance`, `Pendiente`, `En Proceso`).
 * `Enviado` NO restaura: la mercancía está en tránsito con el courier; si el
 * paquete regresa, el reingreso se hace manualmente al recibirlo.
 * `Entregado` y `Cancelado` tampoco (ya está con el cliente / idempotencia).
 */
export function shouldRestoreStockOnCancel(
  from: OrderStatus | string,
  to: OrderStatus | string
): boolean {
  return to === 'Cancelado' && STOCK_RESTORABLE_FROM.includes(from as OrderStatus);
}
