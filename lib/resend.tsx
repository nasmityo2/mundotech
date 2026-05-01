import { OrderConfirmationEmail } from '@/emails/mundotech/OrderConfirmationEmail';
import { OrderDeliveredEmail } from '@/emails/mundotech/OrderDeliveredEmail';
import { PasswordResetEmail } from '@/emails/mundotech/PasswordResetEmail';
import { PaymentValidatedEmail } from '@/emails/mundotech/PaymentValidatedEmail';
import {
  ShippingNotificationEmail,
  type ShippingNotificationOptions,
} from '@/emails/mundotech/ShippingNotificationEmail';
import type { OrderConfirmationPayload } from '@/emails/mundotech/types';
import { emailSiteBaseUrl } from '@/emails/mundotech/site';
import { WelcomeEmail } from '@/emails/mundotech/WelcomeEmail';
import { render } from '@react-email/render';
import { Resend } from 'resend';

export type { OrderConfirmationPayload, OrderConfirmationLineItem } from '@/emails/mundotech/types';

/** @deprecated Use ShippingNotificationOptions — mantenido por compatibilidad con importaciones existentes. */
export type ShippingEmailOptions = ShippingNotificationOptions;

const FROM_ADDRESS = 'Mundo Tech <ventas@jummper.pro>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) {
    return null;
  }
  return new Resend(key);
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

  try {
    const html = await render(
      <PaymentValidatedEmail
        customerName={trimmedName}
        orderDisplayId={trimmedOrderRef}
        orderUuid={orderUuid}
      />
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: 'MundoTech · Pago confirmado — tu pedido va en preparación',
      html,
    });

    if (error) {
      console.error('[payment-validated-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[payment-validated-email] Excepción al enviar a', trimmedEmail, err);
  }
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

  try {
    const html = await render(<OrderConfirmationEmail {...order} />);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: `MundoTech · Pedido #${subjNo} recibido`,
      html,
    });

    if (error) {
      console.error('[order-confirmation-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[order-confirmation-email] Excepción al enviar a', trimmedEmail, err);
  }
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

  try {
    const html = await render(
      <ShippingNotificationEmail
        customerName={trimmedName}
        trackingNumber={trimmedTracking}
        opts={opts}
      />
    );

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: 'MundoTech · Tu pedido va en camino',
      html,
    });

    if (error) {
      console.error('[shipping-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[shipping-email] Excepción al enviar correo de envío a', trimmedEmail, err);
  }
}

/** Notificación de pedido marcado como entregado en admin. */
export async function sendOrderDeliveredEmail(email: string, firstName: string, orderUuid: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[order-delivered-email] RESEND_API_KEY no está configurada; se omite el envío para:', email);
    return;
  }

  const trimmedEmail = email.trim();
  const id = orderUuid.trim();
  if (!trimmedEmail || !id) {
    console.warn('[order-delivered-email] Email o ID vacío; se omite el envío.');
    return;
  }

  const trimmedName = firstName.trim() || 'Cliente';

  try {
    const html = await render(<OrderDeliveredEmail customerName={trimmedName} orderUuid={id} />);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: 'MundoTech · Tu pedido fue entregado',
      html,
    });

    if (error) {
      console.error('[order-delivered-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[order-delivered-email] Excepción al enviar a', trimmedEmail, err);
  }
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

  try {
    const html = await render(<WelcomeEmail customerName={trimmed} />);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Bienvenido a MundoTech',
      html,
    });

    if (error) {
      console.error('[welcome-email] Error de Resend al enviar a', email, error);
    }
  } catch (err) {
    console.error('[welcome-email] Excepción al enviar correo de bienvenida a', email, err);
  }
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

  try {
    const html = await render(<PasswordResetEmail resetUrl={resetUrl} />);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: 'MundoTech · Restablecer tu contraseña',
      html,
    });

    if (error) {
      console.error('[password-reset-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[password-reset-email] Excepción al enviar a', trimmedEmail, err);
  }
}
