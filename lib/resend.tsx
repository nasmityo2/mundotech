import { OrderConfirmationEmail } from '@/emails/mundotech/OrderConfirmationEmail';
import { OrderDeliveredEmail } from '@/emails/mundotech/OrderDeliveredEmail';
import { PasswordResetEmail } from '@/emails/mundotech/PasswordResetEmail';
import { PaymentValidatedEmail } from '@/emails/mundotech/PaymentValidatedEmail';
import { PaymentRejectedEmail } from '@/emails/mundotech/PaymentRejectedEmail';
import {
  ShippingNotificationEmail,
  type ShippingNotificationOptions,
} from '@/emails/mundotech/ShippingNotificationEmail';
import { RestockNotificationEmail } from '@/emails/mundotech/RestockNotificationEmail';
import { AbandonedCartEmail } from '@/emails/mundotech/AbandonedCartEmail';
import type { OrderConfirmationPayload } from '@/emails/mundotech/types';
import type { AbandonedCartItem } from '@/lib/definitions';
import { emailSiteBaseUrl, emailContactAddress } from '@/emails/mundotech/site';
import { WelcomeEmail } from '@/emails/mundotech/WelcomeEmail';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import * as React from 'react';

export type { OrderConfirmationPayload, OrderConfirmationLineItem } from '@/emails/mundotech/types';

/** @deprecated Use ShippingNotificationOptions — mantenido por compatibilidad con importaciones existentes. */
export type ShippingEmailOptions = ShippingNotificationOptions;

/** Nombre visible de la marca en el remitente. */
const BRAND_SENDER_NAME = 'MundoTech';

/**
 * Remitente de los correos. Se lee de `RESEND_FROM_ADDRESS` (dominio verificado en
 * Resend, p. ej. `noreply@mundotech.com.ve`). Si el valor ya trae nombre visible
 * (`Nombre <correo>`) se respeta; si es solo el correo, se antepone la marca.
 * El fallback usa el dominio de la tienda, nunca un dominio de terceros.
 */
function resolveFromAddress(): string {
  const raw = process.env.RESEND_FROM_ADDRESS?.trim();
  if (!raw) return `${BRAND_SENDER_NAME} <noreply@jummper.pro>`;
  if (raw.includes('<') && raw.includes('>')) return raw;
  return `${BRAND_SENDER_NAME} <${raw}>`;
}

const FROM_ADDRESS = resolveFromAddress();

/** Dirección de respuesta: el correo de atención real de la tienda. */
const REPLY_TO_ADDRESS = emailContactAddress();

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) {
    return null;
  }
  return new Resend(key);
}

/**
 * Envía un correo transaccional renderizando HTML + texto plano desde el mismo
 * componente React. El texto plano mejora la entregabilidad (menos spam) y la
 * accesibilidad en clientes que no renderizan HTML. Los errores se registran y
 * no se relanzan (envío best-effort que nunca debe tumbar el flujo de negocio).
 */
async function sendBrandedEmail(params: {
  resend: Resend;
  to: string;
  subject: string;
  element: React.ReactElement;
  logScope: string;
}): Promise<void> {
  const { resend, to, subject, element, logScope } = params;
  try {
    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: REPLY_TO_ADDRESS,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[${logScope}] Error de Resend al enviar a`, to, error);
    }
  } catch (err) {
    console.error(`[${logScope}] Excepción al enviar a`, to, err);
  }
}

/**
 * Notificación de pago verificado manualmente desde admin. Los errores de Resend no relanzan.
 * `orderId` en este contexto es el número visible del pedido (ej. padded "0123").
 */
export async function sendPaymentValidatedEmail(
  email: string,
  firstName: string,
  orderId: string,
  orderUuid?: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[payment-validated-email] RESEND_API_KEY no está configurada; se omite el envío para:', email);
    return;
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    console.warn('[payment-validated-email] Email vacío; se omite el envío.');
    return;
  }

  const trimmedName = firstName.trim() || 'Cliente';
  const trimmedOrderRef = orderId.trim();

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: 'MundoTech · Pago confirmado — tu pedido va en preparación',
    logScope: 'payment-validated-email',
    element: (
      <PaymentValidatedEmail
        customerName={trimmedName}
        orderDisplayId={trimmedOrderRef}
        orderUuid={orderUuid}
      />
    ),
  });
}

/**
 * Notificación de pago rechazado: el pedido fue cancelado por pago no verificado.
 * `orderId` es el número visible del pedido (ej. "0123"). Errores no relanzan.
 */
export async function sendPaymentRejectedEmail(
  email: string,
  firstName: string,
  orderId: string,
  reason: string,
  orderUuid?: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[payment-rejected-email] RESEND_API_KEY no está configurada; se omite el envío para:', email);
    return;
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    console.warn('[payment-rejected-email] Email vacío; se omite el envío.');
    return;
  }

  const trimmedName = firstName.trim() || 'Cliente';
  const trimmedOrderRef = orderId.trim();

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: `MundoTech · No pudimos verificar el pago de tu pedido #${trimmedOrderRef}`,
    logScope: 'payment-rejected-email',
    element: (
      <PaymentRejectedEmail
        customerName={trimmedName}
        orderDisplayId={trimmedOrderRef}
        reason={reason}
        orderUuid={orderUuid}
      />
    ),
  });
}

/**
 * Confirmación de pedido tras checkout exitoso. Errores se registran; no relanza.
 */
export async function sendOrderConfirmationEmail(order: OrderConfirmationPayload): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      '[order-confirmation-email] RESEND_API_KEY no está configurada; se omite el envío para:',
      order.email
    );
    return;
  }

  const trimmedEmail = order.email.trim();
  if (!trimmedEmail) {
    console.warn('[order-confirmation-email] Email vacío; se omite el envío.');
    return;
  }

  const subjNo = String(order.orderNumber).padStart(4, '0');

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: `MundoTech · Recibimos tu pedido #${subjNo} — ya lo estamos revisando`,
    logScope: 'order-confirmation-email',
    element: <OrderConfirmationEmail {...order} />,
  });
}

/**
 * Envía el correo de envío cuando el pedido sale con guía.
 * Solo debe llamarse desde el servidor. Errores se registran; no relanza.
 */
export async function sendShippingEmail(
  email: string,
  firstName: string,
  trackingNumber: string,
  opts?: ShippingNotificationOptions
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[shipping-email] RESEND_API_KEY no está configurada; se omite el envío para:', email);
    return;
  }

  const trimmedEmail = email.trim();
  const trimmedTracking = trackingNumber.trim();
  if (!trimmedEmail || !trimmedTracking) {
    console.warn('[shipping-email] Email o guía vacíos; se omite el envío.');
    return;
  }

  const trimmedName = firstName.trim() || 'Cliente';

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: 'MundoTech · Tu pedido salió de la tienda — aquí va tu guía',
    logScope: 'shipping-email',
    element: (
      <ShippingNotificationEmail
        customerName={trimmedName}
        trackingNumber={trimmedTracking}
        opts={opts}
      />
    ),
  });
}

/**
 * Notificación de pedido marcado como entregado en admin.
 * `orderRef` es el segmento legible para la URL (#0042), no el cuid.
 */
export async function sendOrderDeliveredEmail(email: string, firstName: string, orderRef: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[order-delivered-email] RESEND_API_KEY no está configurada; se omite el envío para:', email);
    return;
  }

  const trimmedEmail = email.trim();
  const ref = orderRef.trim();
  if (!trimmedEmail || !ref) {
    console.warn('[order-delivered-email] Email o referencia vacío; se omite el envío.');
    return;
  }

  const trimmedName = firstName.trim() || 'Cliente';

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: 'MundoTech · Tu pedido llegó — revisa que todo esté perfecto',
    logScope: 'order-delivered-email',
    element: <OrderDeliveredEmail customerName={trimmedName} orderRef={ref} />,
  });
}

/**
 * Correo de bienvenida tras un registro exitoso.
 * Solo debe llamarse desde el servidor. Errores se registran; no relanza para no afectar el flujo de registro.
 */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[welcome-email] RESEND_API_KEY no está configurada; se omite el envío para:', email);
    return;
  }

  const trimmed = firstName.trim() || 'Cliente';
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    console.warn('[welcome-email] Email vacío; se omite el envío.');
    return;
  }

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: '¡Bienvenido a MundoTech! Tu cuenta ya está lista',
    logScope: 'welcome-email',
    element: <WelcomeEmail customerName={trimmed} />,
  });
}

/**
 * Notificación de restock al cliente suscrito.
 * Solo debe llamarse desde el servidor. Errores se registran; no relanza.
 */
export async function sendRestockNotificationEmail(params: {
  email: string;
  productName: string;
  productUrl: string;
  productImageUrl?: string;
  productPrice?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[restock-email] RESEND_API_KEY no está configurada; se omite el envío para:', params.email);
    return;
  }

  const trimmedEmail = params.email.trim();
  if (!trimmedEmail) {
    console.warn('[restock-email] Email vacío; se omite el envío.');
    return;
  }

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: `MundoTech · ¡${params.productName} volvió al stock!`,
    logScope: 'restock-email',
    element: (
      <RestockNotificationEmail
        productName={params.productName}
        productUrl={params.productUrl}
        productImageUrl={params.productImageUrl}
        productPrice={params.productPrice}
      />
    ),
  });
}

/**
 * Recordatorio de carrito abandonado. El enlace de recuperación lleva al checkout.
 * El token permite al usuario darse de baja de estos recordatorios.
 * Errores se registran; no relanza.
 */
export async function sendAbandonedCartEmail(params: {
  email:         string;
  customerName:  string;
  items:         AbandonedCartItem[];
  totalUsd:      number;
  recoveryToken: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[abandoned-cart-email] RESEND_API_KEY no está configurada; se omite el envío para:', params.email);
    return;
  }

  const trimmedEmail = params.email.trim();
  if (!trimmedEmail || params.items.length === 0) {
    console.warn('[abandoned-cart-email] Email vacío o carrito sin ítems; se omite el envío.');
    return;
  }

  const base          = emailSiteBaseUrl().replace(/\/$/, '');
  const recoveryUrl   = `${base}/checkout`;
  const unsubscribeUrl = `${base}/api/cart/unsubscribe?token=${encodeURIComponent(params.recoveryToken)}`;

  await sendBrandedEmail({
    resend,
    to:       trimmedEmail,
    subject:  'MundoTech · Te guardamos el carrito tal como lo dejaste',
    logScope: 'abandoned-cart-email',
    element: (
      <AbandonedCartEmail
        customerName={params.customerName.trim() || 'Cliente'}
        items={params.items}
        totalUsd={params.totalUsd}
        recoveryUrl={recoveryUrl}
        unsubscribeUrl={unsubscribeUrl}
      />
    ),
  });
}

/** Correo de recuperación de contraseña. Errores se registran; no relanza. */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[password-reset-email] RESEND_API_KEY no está configurada; se omite el envío para:', email);
    return;
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail || !token.trim()) {
    console.warn('[password-reset-email] Email o token vacío; se omite el envío.');
    return;
  }

  const resetUrl = `${emailSiteBaseUrl().replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token.trim())}`;

  await sendBrandedEmail({
    resend,
    to: trimmedEmail,
    subject: 'MundoTech · Restablecer tu contraseña',
    logScope: 'password-reset-email',
    element: <PasswordResetEmail resetUrl={resetUrl} />,
  });
}
