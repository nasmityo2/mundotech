import type { Prisma } from '@prisma/client';
import { z } from 'zod';

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
    items: z.array(orderItemSchema).min(1, 'El pedido debe tener al menos un producto.'),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'Binance Pay') {
      if (!data.paymentReference?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Indica el Order ID o referencia que muestra Binance tras pagar.',
          path: ['paymentReference'],
        });
      }
      if (!data.paymentProofUrl?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Sube la captura de pantalla del pago en Binance.',
          path: ['paymentProofUrl'],
        });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CheckoutExecuteOptions = {
  /** Si true, crea el pedido pero no descuenta stock (espera aprobación admin). */
  deferStockDeduction?: boolean;
  /** Estado inicial del pedido (ej. verificación Binance). */
  orderStatus?: string;
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
    items,
  } = input;

  const deferStock = options?.deferStockDeduction ?? false;
  const orderStatus = options?.orderStatus ?? 'Pendiente';

  const productIds = items.map((i) => i.productId);
  const dbProducts = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, stock: true, name: true },
  });

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  for (const item of items) {
    const dbProduct = productMap.get(item.productId);
    if (!dbProduct) {
      throw new Error(`Producto "${item.productId}" no encontrado en el catálogo.`);
    }
    if (dbProduct.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para "${dbProduct.name}". ` +
          `Solicitado: ${item.quantity}, disponible: ${dbProduct.stock}.`
      );
    }
  }

  const serverTotal = items.reduce((sum, item) => {
    return sum + productMap.get(item.productId)!.price * item.quantity;
  }, 0);

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
      total: serverTotal,
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
        create: items.map((item) => ({
          productId: item.productId,
          productName: productMap.get(item.productId)!.name,
          quantity: item.quantity,
          price: productMap.get(item.productId)!.price,
          imageUrl: item.imageUrl ?? null,
        })),
      },
    },
    include: { items: true },
  });

  if (!deferStock) {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
  }

  return newOrder;
}
