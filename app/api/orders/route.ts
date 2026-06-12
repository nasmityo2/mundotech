import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { absoluteEmailUrl } from '@/emails/mundotech/site';
import type { OrderConfirmationPayload } from '@/emails/mundotech/types';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prismaOrderToOrder } from '@/lib/definitions';
import {
  checkoutSchema,
  executeCheckoutInTransaction,
  findRecentDuplicateOrderInTransaction,
} from '@/lib/checkout-order';
import { CheckoutError } from '@/lib/checkout-error';
import { roundMoney2 } from '@/lib/exchange-rate';
import { readSettings } from '@/lib/data-store';
import { markCartRecovered } from '@/lib/abandoned-cart';
import { sendOrderConfirmationEmail } from '@/lib/resend';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifySameOrigin } from '@/lib/security';

/** Solo admins pueden ver el listado global de pedidos. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders.map(prismaOrderToOrder));
}

/**
 * POST /api/orders — checkout atómico.
 *
 * El customerId del body es ignorado: siempre se usa session.user.id
 * del servidor para evitar que un cliente vincule un pedido al ID de
 * otra cuenta. Sin sesión se responde 401 (PRD-069): la tienda exige login
 * para comprar, igual que la UI.
 *
 * Binance Pay: el pedido inicia como "Pendiente verificación Binance".
 * El stock se descuenta atómicamente en esta misma transacción (`updateMany`
 * con `stock >= cantidad`). `approve-binance` verifica el pago en UN paso
 * (→ "En Proceso" + `paidAt`); al cancelar se restaura inventario cuando el
 * pedido seguía con stock reservado (ver `shouldRestoreStockOnCancel`).
 */
export async function POST(request: Request) {
  // Mitigación CSRF: peticiones de navegador desde otro origen se rechazan
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ message: 'Origen no permitido.' }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (await rateLimit(`orders:post:ip:${ip}`, { limit: 5, windowMs: 60_000 })) {
    return NextResponse.json(
      { message: 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.' },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // PRD-069: la tienda exige iniciar sesión para comprar (middleware protege
  // /checkout). Un POST directo sin sesión no debe poder crear pedidos "guest".
  if (!userId || userId === 'guest') {
    return NextResponse.json(
      { message: 'Inicia sesión para completar tu compra.' },
      { status: 401 }
    );
  }

  if (await rateLimit(`orders:post:user:${userId}`, { limit: 5, windowMs: 60_000 })) {
    return NextResponse.json(
      { message: 'Demasiadas solicitudes. Espera un momento antes de intentarlo de nuevo.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      console.error('[POST /api/orders] Zod validation failed:', JSON.stringify(parsed.error.issues, null, 2));
      return NextResponse.json(
        { message: 'Datos de pedido inválidos.', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    // Ignorar el customerId enviado por el cliente; usar siempre la sesión del servidor
    const safeData = {
      ...parsed.data,
      customerId: userId,
    };

    // PRD-128 (R1): para retiro en tienda la dirección NUNCA viene del cliente —
    // se resuelve desde la configuración persistida de la tienda.
    if (safeData.shippingMethod === 'tienda') {
      const settings = await readSettings();
      safeData.shippingDetails = {
        ...safeData.shippingDetails,
        address: `Retiro en tienda ${settings.storeName} — ${settings.address}`,
      };
    }

    const isBinanceManual = safeData.paymentMethod === 'Binance Pay';

    // PRD-131: reintentos (doble clic, recarga, retry de red) con la misma
    // referencia de pago devuelven el pedido ya creado en vez de duplicarlo.
    const { order, reused } = await prisma.$transaction(async (tx) => {
      const duplicate = await findRecentDuplicateOrderInTransaction(tx, {
        customerId: userId,
        paymentReference: safeData.paymentReference,
      });
      if (duplicate) return { order: duplicate, reused: true };

      const created = await executeCheckoutInTransaction(tx, safeData, {
        orderStatus: isBinanceManual ? 'Pendiente verificación Binance' : 'Pendiente',
      });
      return { order: created, reused: false };
    });

    if (reused) {
      console.warn('[POST /api/orders] Pedido duplicado evitado; se reutiliza:', order.id);
      return NextResponse.json(prismaOrderToOrder(order), { status: 200 });
    }

    // PRD-180: marcar el carrito abandonado como recuperado SOLO server-side,
    // tras confirmar el pedido (best-effort; markCartRecovered nunca lanza).
    // Se cubren ambos correos: el de contacto del pedido y el de la sesión
    // (el snapshot se guarda con el email de sesión — ver saveCartSnapshotAction).
    const recoveredEmails = new Set(
      [order.customerEmail, session?.user?.email]
        .map((e) => e?.trim().toLowerCase())
        .filter((e): e is string => !!e)
    );
    for (const email of recoveredEmails) {
      await markCartRecovered(email);
    }

    let recipientEmail = order.customerEmail?.trim() ?? '';
    if (!recipientEmail && order.customerId) {
      const u = await prisma.user.findUnique({
        where: { id: order.customerId },
        select: { email: true },
      });
      recipientEmail = u?.email?.trim() ?? '';
    }

    if (recipientEmail) {
      const productIds = [...new Set(order.items.map((i) => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          slug: true,
          images: true,
          media: {
            where: { type: 'IMAGE' },
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { url: true },
          },
        },
      });
      const slugById = new Map(
        products.map((p) => [p.id, (p.slug?.trim() || p.id) as string])
      );
      // Respaldo de imagen: si la línea del pedido no guardó imagen, usamos la
      // foto del producto para que el correo siempre muestre el artículo.
      const fallbackImageById = new Map(
        products.map((p) => [p.id, p.images?.[0]?.trim() || p.media?.[0]?.url?.trim() || null])
      );

      const rate = order.exchangeRateUsdBs;
      const priceUsdFromStored = (priceStored: number) =>
        rate != null && rate > 0 ? roundMoney2(priceStored / rate) : roundMoney2(priceStored);

      const itemsPayload = order.items.map((i) => ({
        name: i.productName,
        slug: slugById.get(i.productId) ?? i.productId,
        image: absoluteEmailUrl(i.imageUrl || fallbackImageById.get(i.productId) || null),
        priceUsd: priceUsdFromStored(i.price),
        quantity: i.quantity,
      }));

      // La tienda no cobra envío: el total autoritativo (Bs) es el subtotal.
      // Evita una "Tarifa de envío" fantasma por redondeo Bs↔USD por línea.
      const totalUsd =
        rate != null && rate > 0 ? roundMoney2(order.total / rate) : roundMoney2(order.total);
      const subtotalUsd = totalUsd;
      const shippingUsd = 0;

      // DEPENDENCIA-06 (PRD-202): OrderConfirmationPayload solo transporta USD +
      // tasa y la plantilla recalcula los Bs. Cuando 06-EMAILS agregue campos de
      // montos Bs congelados al payload, aquí debe pasarse order.total (Bs)
      // directamente en vez de derivarlo de totalUsd × tasa.
      const confirmationPayload: OrderConfirmationPayload = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName.trim() || 'Cliente',
        email: recipientEmail,
        createdAt: order.createdAt,
        status: order.status,
        items: itemsPayload,
        subtotalUsd,
        shippingUsd,
        totalUsd,
        exchangeRateUsdBs: rate ?? null,
        paymentMethod: order.paymentMethod,
        paymentBank: order.paymentBank,
        paymentReference: order.paymentReference,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingZipCode: order.shippingZipCode,
        shippingCountry: order.shippingCountry,
        customerPhone: order.customerPhone,
        shippingMethod: order.trackingCarrier ?? null,
      };

      // Best-effort: el pedido YA está confirmado en BD; un fallo de Resend
      // jamás debe presentarse al cliente como checkout fallido.
      try {
        await sendOrderConfirmationEmail(confirmationPayload);
      } catch (emailError) {
        console.error('[order-confirmation-email] Fallo no crítico:', emailError);
      }
    } else {
      console.warn(
        '[order-confirmation-email] Pedido',
        order.id,
        'creado sin email de contacto; no se envía confirmación.'
      );
    }

    return NextResponse.json(prismaOrderToOrder(order), { status: 201 });
  } catch (error) {
    console.error('[POST /api/orders]', error);

    // PRD-029/PRD-070: solo los errores de negocio (CheckoutError) exponen su
    // mensaje y status (400/404/409). Cualquier error interno responde 500 con
    // mensaje genérico para no filtrar detalles de BD/inventario.
    if (error instanceof CheckoutError) {
      return NextResponse.json({ message: error.message }, { status: error.httpStatus });
    }
    return NextResponse.json(
      { message: 'No pudimos procesar tu pedido en este momento. Intenta de nuevo en unos minutos.' },
      { status: 500 }
    );
  }
}
