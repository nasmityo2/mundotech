'use server';

import { prisma } from '@/lib/prisma';
import { sendRestockNotificationEmail } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { requireAdminAction } from '@/lib/api-auth';
import { getActionClientIp } from '@/lib/security';
import { z } from 'zod';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotechve.com';

const subscribeSchema = z.object({
  email:     z.string().email('Email inválido'),
  productId: z.string().min(1, 'Producto requerido'),
});

/**
 * Suscribe un email para recibir aviso cuando el producto vuelva a tener stock.
 * No requiere sesión — funciona para visitantes y clientes registrados.
 * Rate limit: 5 suscripciones por IP por hora.
 */
export async function subscribeRestockAction(
  email: string,
  productId: string,
): Promise<{ success: boolean; message: string }> {
  // Rate limiting por IP para evitar spam.
  // PRD-019: getActionClientIp respeta DEPLOYMENT_ENV y toma el último valor
  // de x-forwarded-for (el primero es falsificable por el cliente).
  const ip = await getActionClientIp();

  const blocked = await rateLimit(`restock:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (blocked) {
    return { success: false, message: 'Demasiados intentos. Inténtalo más tarde.' };
  }

  const parsed = subscribeSchema.safeParse({ email, productId });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  try {
    const product = await prisma.product.findUnique({
      where:  { id: productId },
      select: { id: true, stock: true },
    });

    if (!product) {
      return { success: false, message: 'Producto no encontrado.' };
    }

    if (product.stock > 0) {
      return { success: false, message: 'Este producto ya tiene stock disponible.' };
    }

    await prisma.restockSubscription.upsert({
      where:  { email_productId: { email: parsed.data.email, productId } },
      update: { notifiedAt: null },
      create: { email: parsed.data.email, productId },
    });

    return {
      success: true,
      message: 'Te avisaremos por email cuando el producto esté disponible.',
    };
  } catch (err) {
    console.error('[restock] Error al suscribir:', err);
    return { success: false, message: 'No se pudo registrar tu solicitud. Inténtalo de nuevo.' };
  }
}

/**
 * Envía emails a todos los suscriptores pendientes de un producto que acaba de
 * tener restock. Marca `notifiedAt` para no reenviar. Best-effort: errores no
 * relanzan para no bloquear la actualización del admin.
 *
 * Debe llamarse SOLO cuando el stock pasa de 0 a > 0.
 */
export async function triggerRestockNotifications(
  productId: string,
  productName: string,
  productSlug: string | null,
  productImageUrl?: string | null,
  productPrice?: number,
): Promise<void> {
  /*
   * PRD-006: este archivo es 'use server' → toda función exportada es un
   * endpoint RPC público. Sin este guard, cualquiera podía disparar email
   * bombing a los suscriptores de restock. Los llamadores legítimos
   * (quickUpdateStockAction / updateProductAction) ya corren con sesión
   * admin, así que el guard no altera el flujo normal.
   */
  try {
    await requireAdminAction();
  } catch {
    console.warn(
      '[restock] Invocación no autorizada de triggerRestockNotifications; ignorada.',
    );
    return;
  }

  try {
    const subscribers = await prisma.restockSubscription.findMany({
      where: { productId, notifiedAt: null },
      select: { id: true, email: true },
    });

    if (subscribers.length === 0) return;

    const slug      = productSlug ?? productId;
    const productUrl = `${SITE_URL}/product/${slug}`;
    const priceStr   = productPrice != null
      ? `US $${productPrice.toFixed(2)}`
      : undefined;

    const now = new Date();

    await Promise.allSettled(
      subscribers.map(async (sub) => {
        await sendRestockNotificationEmail({
          email:           sub.email,
          productName,
          productUrl,
          productImageUrl: productImageUrl ?? undefined,
          productPrice:    priceStr,
        });

        await prisma.restockSubscription.update({
          where: { id: sub.id },
          data:  { notifiedAt: now },
        });
      }),
    );

    console.info(`[restock] Notificados ${subscribers.length} suscriptores para producto ${productId}`);
  } catch (err) {
    console.error('[restock] Error al disparar notificaciones:', err);
  }
}
