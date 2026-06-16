import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
import { d, dn } from '@/lib/decimal';
import { buildOrderListWhere, buildOrderSearchWhere } from '@/lib/orders/order-list-filters';
import { computeTabCounts, parseOrderTab } from '@/lib/orders/order-tabs';
import {
  decodeOrderCursor,
  encodeOrderCursor,
  orderCursorWhere,
} from '@/lib/orders/order-cursor';

const CHECKOUT_TX_MAX_RETRIES = 3;

/** Reintenta transacciones ante conflictos de serialización de Postgres (P2034 / 40001). */
function isSerializationFailure(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    if ((error as { code: string }).code === 'P2034') return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('40001') || message.includes('could not serialize');
}

async function runCheckoutTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < CHECKOUT_TX_MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isSerializationFailure(error) && attempt < CHECKOUT_TX_MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Checkout transaction retries exhausted');
}

/**
 * PRD-195: GET /api/orders con paginación por cursor (opt-in).
 * - Sin parámetros: devuelve el array completo (compatibilidad con /admin/stats).
 * - Con ?limit=N: devuelve { orders: [...], nextCursor: string | null }.
 * - Con ?limit=N&cursor=lastId: devuelve la página siguiente.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor') ?? undefined;

    if (limitParam !== null) {
      const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200);
      const tab = parseOrderTab(searchParams.get('tab'), searchParams.get('status'));
      const q = searchParams.get('q') ?? '';
      const where = await buildOrderListWhere(tab, q);

      const cursorRaw = cursor ?? undefined;
      const decodedCursor = cursorRaw ? decodeOrderCursor(cursorRaw) : null;
      const pageWhere =
        decodedCursor != null
          ? { AND: [where, orderCursorWhere(decodedCursor)] }
          : where;

      const countsWhere = q.trim() ? await buildOrderSearchWhere(q) : {};

      const [orders, total, statusGroups] = await Promise.all([
        prisma.order.findMany({
          where: pageWhere,
          take: limit + 1,
          include: { items: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        prisma.order.count({ where }),
        prisma.order.groupBy({
          by: ['status'],
          where: countsWhere,
          _count: { _all: true },
        }),
      ]);

      const hasNextPage = orders.length > limit;
      const page = hasNextPage ? orders.slice(0, limit) : orders;
      const lastRow = page[page.length - 1];
      const nextCursor =
        hasNextPage && lastRow != null
          ? encodeOrderCursor({ createdAt: lastRow.createdAt, id: lastRow.id })
          : null;

      return NextResponse.json({
        orders: page.map(prismaOrderToOrder),
        nextCursor,
        total,
        counts: computeTabCounts(statusGroups),
      });
    }

    // Fallback sin paginación (mantiene compatibilidad con /admin/stats y exportación CSV).
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return NextResponse.json(orders.map(prismaOrderToOrder));
  } catch (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json(
      { message: 'Error al obtener los pedidos.' },
      { status: 500 },
    );
  }
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
    const { order, reused } = await runCheckoutTransaction(async (tx) => {
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

      // PRD-204: convertir Decimal → number en la frontera BD→email payload
      const rate = dn(order.exchangeRateUsdBs);
      const priceUsdFromStored = (priceStored: number) =>
        rate != null && rate > 0 ? roundMoney2(priceStored / rate) : roundMoney2(priceStored);

      const itemsPayload = order.items.map((i) => ({
        name: i.productName,
        slug: slugById.get(i.productId) ?? i.productId,
        image: absoluteEmailUrl(i.imageUrl || fallbackImageById.get(i.productId) || null),
        priceUsd: priceUsdFromStored(d(i.price)),
        quantity: i.quantity,
      }));

      // La tienda no cobra envío: el total autoritativo (Bs) es el subtotal.
      // Evita una "Tarifa de envío" fantasma por redondeo Bs↔USD por línea.
      const totalNum = d(order.total);
      const totalUsd =
        rate != null && rate > 0 ? roundMoney2(totalNum / rate) : roundMoney2(totalNum);
      const subtotalUsd = totalUsd;
      const shippingUsd = 0;

      // PRD-202: montos Bs congelados — order.total ya está en Bs.
      const totalBs = totalNum;
      const subtotalBs = totalBs;
      const shippingBs = 0;

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
        subtotalBs,
        shippingBs,
        totalBs,
        exchangeRateUsdBs: rate,
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
      // PRD-051: el log incluye id y orderNumber para que ops pueda reenviar
      // manualmente desde admin → PRD-051 requiere endpoint resend (DEPENDENCIA-05).
      try {
        await sendOrderConfirmationEmail(confirmationPayload);
      } catch (emailError) {
        console.error(
          '[order-confirmation-email] Fallo no crítico — pedido confirmado en BD.',
          `Reenviar manualmente: orderId=${order.id} orderNumber=${order.orderNumber} email=${recipientEmail}`,
          emailError,
        );
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
