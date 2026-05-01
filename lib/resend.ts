import { Resend } from 'resend';
import { getOrderDualMoney, hasFrozenBsPricing } from '@/lib/order-pricing';

const FROM_ADDRESS = 'Mundo Tech <ventas@jummper.pro>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) {
    return null;
  }
  return new Resend(key);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Monto en bolívares para tablas de correo (coherente con la tienda). */
function formatVES(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
  }).format(amount);
}

function siteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://mundotech.com.ve';
}

/** Datos del pedido para el HTML de confirmación (sin datos sensibles extra). */
export type OrderConfirmationEmailDetail = {
  orderNumber: number;
  orderId: string;
  createdAt: Date;
  status: string;
  total: number;
  paymentMethod: string;
  paymentBank?: string | null;
  paymentReference?: string | null;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  customerPhone?: string | null;
  /** Tasa usada al cobrar (Bs/USD). Si falta, los montos del pedido se interpretan como USD (legado). */
  exchangeRateUsdBs?: number | null;
  items: { productName: string; quantity: number; price: number }[];
};

function buildOrderConfirmationEmailHtml(firstName: string, detail: OrderConfirmationEmailDetail): string {
  const pricingMeta = { exchangeRateUsdBs: detail.exchangeRateUsdBs ?? null };
  const safeName = escapeHtml(firstName);
  const orderNo = String(detail.orderNumber).padStart(4, '0');
  const safeOrderNo = escapeHtml(orderNo);
  const when = detail.createdAt.toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const safeWhen = escapeHtml(when);
  const safeStatus = escapeHtml(detail.status);
  const safePay = escapeHtml(detail.paymentMethod);
  const safeBank = detail.paymentBank?.trim() ? escapeHtml(detail.paymentBank.trim()) : '';
  const safeRef = detail.paymentReference?.trim() ? escapeHtml(detail.paymentReference.trim()) : '';
  const safeAddr = escapeHtml(detail.shippingAddress);
  const safeCity = escapeHtml(detail.shippingCity);
  const safeState = escapeHtml(detail.shippingState);
  const safeZip = escapeHtml(detail.shippingZipCode);
  const safeCountry = escapeHtml(detail.shippingCountry);
  const safePhone = detail.customerPhone?.trim() ? escapeHtml(detail.customerPhone.trim()) : '';

  const dualMoneyCells = (amount: number) => {
    const d = getOrderDualMoney(amount, pricingMeta);
    if (hasFrozenBsPricing(pricingMeta)) {
      return `${escapeHtml(d.bs)}<br/><span style="font-size:12px;color:#64748b;">${escapeHtml(d.usd)}</span>`;
    }
    return escapeHtml(d.usd);
  };

  const rowsHtml = detail.items
    .map((item) => {
      const line = item.price * item.quantity;
      return `
                <tr>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #2a2f3a; color: #e2e8f0; font-size: 14px;">
                    ${escapeHtml(item.productName)}
                  </td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #2a2f3a; color: #94a3b8; font-size: 13px; text-align: center;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #2a2f3a; color: #94a3b8; font-size: 13px; text-align: right; line-height: 1.35;">
                    ${dualMoneyCells(item.price)}
                  </td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #2a2f3a; color: #f8fafc; font-size: 13px; text-align: right; line-height: 1.35; font-weight: 600;">
                    ${dualMoneyCells(line)}
                  </td>
                </tr>`;
    })
    .join('');

  const rateNote =
    detail.exchangeRateUsdBs != null && detail.exchangeRateUsdBs > 0
      ? `<p style="margin: 10px 0 0; font-size: 12px; color: #64748b;"><strong style="color: #94a3b8;">Tasa registrada en este pedido (no cambia):</strong> Bs. ${escapeHtml(detail.exchangeRateUsdBs.toFixed(2))} / USD. Los montos anteriores son los que pagaste en ese momento.</p>`
      : `<p style="margin: 10px 0 0; font-size: 12px; color: #64748b;">Montos en dólares (USD); pedido anterior al registro de tasa en el sistema.</p>`;

  const orderUrl = `${siteBaseUrl()}/account/orders/${encodeURIComponent(detail.orderId)}`;

  const payExtras =
    (safeBank
      ? `<p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Banco: <strong style="color: #e2e8f0;">${safeBank}</strong></p>`
      : '') +
    (safeRef
      ? `<p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Referencia: <strong style="color: #e2e8f0;">${safeRef}</strong></p>`
      : '');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido #${safeOrderNo}</title>
</head>
<body style="margin:0; padding:0; background-color:#0f1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: linear-gradient(145deg, #161b22 0%, #1a1f2e 100%); border-radius: 16px; border: 1px solid #2a2f3a; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.45);">
          <tr>
            <td style="padding: 36px 36px 28px; text-align: center; background: linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 100%);">
              <p style="margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #f8fafc;">Mundo Tech</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.04em;">Conectados Contigo</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 8px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #e2e8f0;">¡Hola <strong style="color: #f8fafc;">${safeName}</strong>!</p>
              <p style="margin: 18px 0 0; font-size: 15px; line-height: 1.75; color: #cbd5e1;">
                Gracias por tu compra. Aquí tienes el resumen del <strong style="color: #f8fafc;">pedido #${safeOrderNo}</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 18px; border-radius: 10px; background: rgba(15,23,42,0.5); border: 1px solid #2a2f3a;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="margin: 0; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b;">Fecha</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #e2e8f0;">${safeWhen}</p>
                    <p style="margin: 12px 0 0; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b;">Estado</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #38bdf8; font-weight: 600;">${safeStatus}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 36px 8px;">
              <p style="margin: 0 0 10px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280;">Productos</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #2a2f3a; border-radius: 10px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(56,189,248,0.08);">
                    <th align="left" style="padding: 10px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8;">Artículo</th>
                    <th style="padding: 10px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8;">Cant.</th>
                    <th align="right" style="padding: 10px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8;">P. unit.<br/><span style="font-weight:400;font-size:9px;letter-spacing:0.06em;">Bs. / USD</span></th>
                    <th align="right" style="padding: 10px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8;">Subtotal<br/><span style="font-weight:400;font-size:9px;letter-spacing:0.06em;">Bs. / USD</span></th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                  <tr>
                    <td colspan="3" style="padding: 14px 10px; text-align: right; font-size: 14px; font-weight: 700; color: #cbd5e1;">Total</td>
                    <td style="padding: 14px 10px; text-align: right; font-size: 15px; font-weight: 700; color: #38bdf8; line-height: 1.35;">
                      ${dualMoneyCells(detail.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
              ${rateNote}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 36px 8px;">
              <p style="margin: 0 0 10px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280;">Envío</p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">${safeAddr}</p>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">${safeCity}, ${safeState} · C.P. ${safeZip} · ${safeCountry}</p>
              ${safePhone ? `<p style="margin: 8px 0 0; font-size: 13px; color: #94a3b8;">Tel: <span style="color: #e2e8f0;">${safePhone}</span></p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 36px 20px;">
              <p style="margin: 0 0 10px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280;">Pago</p>
              <p style="margin: 0; font-size: 14px; color: #e2e8f0;"><strong>${safePay}</strong></p>
              ${payExtras}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 36px 28px; text-align: center;">
              <a href="${escapeHtml(orderUrl)}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #0f1117; background: linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%); border-radius: 12px; text-decoration: none; box-shadow: 0 8px 24px rgba(14,165,233,0.35);">Ver mi pedido</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 36px 36px; text-align: center; border-top: 1px solid #2a2f3a;">
              <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.65; color: #94a3b8;">
                Tecnología premium en <strong style="color: #f8fafc;">Barquisimeto</strong>.
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; letter-spacing: 0.06em;">Conectados Contigo</p>
              <p style="margin: 0;">
                <a href="mailto:ventas@jummper.pro" style="color: #38bdf8; text-decoration: none; font-size: 13px;">ventas@jummper.pro</a>
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: #475569;">Mundo Tech · Venezuela</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPaymentValidatedEmailHtml(firstName: string, orderDisplayId: string): string {
  const safeName = escapeHtml(firstName);
  const safeOrderRef = escapeHtml(orderDisplayId);
  const ordersUrl = 'https://jummper.pro/mis-pedidos';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago confirmado</title>
</head>
<body style="margin:0; padding:0; background-color:#0f1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: linear-gradient(145deg, #161b22 0%, #1a1f2e 100%); border-radius: 16px; border: 1px solid #2a2f3a; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.45);">
          <tr>
            <td style="padding: 36px 36px 28px; text-align: center; background: linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 100%);">
              <p style="margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #f8fafc;">Mundo Tech</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.04em;">Conectados Contigo</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 8px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #e2e8f0;">Hola <strong style="color: #f8fafc;">${safeName}</strong>,</p>
              <p style="margin: 18px 0 0; font-size: 15px; line-height: 1.75; color: #cbd5e1;">
                Hemos verificado tu pago exitosamente para el pedido <strong style="color: #38bdf8;">#${safeOrderRef}</strong>. Ya estamos preparando tu paquete con el mayor cuidado.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 36px 28px; text-align: center;">
              <a href="${escapeHtml(ordersUrl)}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #0f1117; background: linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%); border-radius: 12px; text-decoration: none; box-shadow: 0 8px 24px rgba(14,165,233,0.35);">Ver detalles de mi pedido</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 36px 36px; text-align: center; border-top: 1px solid #2a2f3a;">
              <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.65; color: #94a3b8;">
                Conectados contigo desde <strong style="color: #f8fafc;">Barquisimeto</strong>.
              </p>
              <p style="margin: 0;">
                <a href="mailto:ventas@jummper.pro" style="color: #38bdf8; text-decoration: none; font-size: 13px;">ventas@jummper.pro</a>
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: #475569;">Mundo Tech · Venezuela</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Notificación de pago verificado manualmente desde admin. Los errores de Resend no relanzan.
 * `orderId` en este contexto es el número visible del pedido (ej. padded "0123").
 */
export async function sendPaymentValidatedEmail(
  email: string,
  firstName: string,
  orderId: string
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
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: '✅ ¡Pago Confirmado! Tu pedido de Mundo Tech está en preparación.',
      html: buildPaymentValidatedEmailHtml(trimmedName, trimmedOrderRef),
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
export async function sendOrderConfirmationEmail(
  email: string,
  firstName: string,
  detail: OrderConfirmationEmailDetail
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      '[order-confirmation-email] RESEND_API_KEY no está configurada; se omite el envío para:',
      email
    );
    return;
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    console.warn('[order-confirmation-email] Email vacío; se omite el envío.');
    return;
  }

  const trimmedName = firstName.trim() || 'Cliente';
  const subjNo = String(detail.orderNumber).padStart(4, '0');

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: `✅ Mundo Tech · Pedido #${subjNo} recibido`,
      html: buildOrderConfirmationEmailHtml(trimmedName, detail),
    });

    if (error) {
      console.error('[order-confirmation-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[order-confirmation-email] Excepción al enviar a', trimmedEmail, err);
  }
}

function buildWelcomeEmailHtml(firstName: string): string {
  const safeName = escapeHtml(firstName);

  const socialLinks: { label: string; url: string }[] = [];
  const ig = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
  const fb = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim();
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  if (ig) socialLinks.push({ label: 'Instagram', url: ig });
  if (fb) socialLinks.push({ label: 'Facebook', url: fb });
  if (wa) socialLinks.push({ label: 'WhatsApp', url: wa });

  const socialRow =
    socialLinks.length === 0
      ? ''
      : `
      <tr>
        <td style="padding: 24px 36px 36px; text-align: center; border-top: 1px solid #2a2f3a;">
          <p style="margin: 0 0 12px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280;">Redes</p>
          <p style="margin: 0; font-size: 13px; line-height: 1.8;">
            ${socialLinks
              .map(
                (l) =>
                  `<a href="${escapeHtml(l.url)}" style="color: #38bdf8; text-decoration: none; margin: 0 10px;">${escapeHtml(l.label)}</a>`
              )
              .join('·')}
          </p>
        </td>
      </tr>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Mundo Tech</title>
</head>
<body style="margin:0; padding:0; background-color:#0f1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: linear-gradient(145deg, #161b22 0%, #1a1f2e 100%); border-radius: 16px; border: 1px solid #2a2f3a; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.45);">
          <tr>
            <td style="padding: 36px 36px 28px; text-align: center; background: linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 100%);">
              <p style="margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #f8fafc;">Mundo Tech</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.04em;">Conectados Contigo</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 8px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #e2e8f0;">Hola <strong style="color: #f8fafc;">${safeName}</strong>,</p>
              <p style="margin: 18px 0 0; font-size: 15px; line-height: 1.75; color: #cbd5e1;">
                Nos alegra darte la bienvenida. Estamos cerca de ti en <strong style="color: #f8fafc;">Barquisimeto</strong>, acompañando tu experiencia tech con el mismo cuidado en tienda y en línea.
              </p>
              <p style="margin: 20px 0 0; font-size: 15px; line-height: 1.75; color: #cbd5e1;">
                Gracias por unirte a la comunidad tecnológica más avanzada. Ahora tienes acceso a lanzamientos exclusivos de hardware, seguimiento de pedidos en tiempo real y soporte prioritario.
              </p>
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                — El equipo de Mundo Tech
              </p>
            </td>
          </tr>
          ${socialRow}
          <tr>
            <td style="padding: 28px 36px 36px; text-align: center; border-top: 1px solid #2a2f3a;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">Contacto</p>
              <p style="margin: 0;">
                <a href="mailto:ventas@jummper.pro" style="color: #38bdf8; text-decoration: none; font-size: 13px;">ventas@jummper.pro</a>
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: #475569;">Mundo Tech · Venezuela</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildShippingEmailHtml(firstName: string, trackingNumber: string): string {
  const safeName = escapeHtml(firstName);
  const safeTracking = escapeHtml(trackingNumber.trim());
  const trackUrl = `https://jummper.pro/tracking/${encodeURIComponent(trackingNumber.trim())}`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu pedido va en camino</title>
</head>
<body style="margin:0; padding:0; background-color:#0f1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: linear-gradient(145deg, #161b22 0%, #1a1f2e 100%); border-radius: 16px; border: 1px solid #2a2f3a; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.45);">
          <tr>
            <td style="padding: 36px 36px 28px; text-align: center; background: linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 100%);">
              <p style="margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #f8fafc;">Mundo Tech</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.04em;">Conectados Contigo</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 8px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #e2e8f0;">¡Hola <strong style="color: #f8fafc;">${safeName}</strong>!</p>
              <p style="margin: 18px 0 0; font-size: 15px; line-height: 1.75; color: #cbd5e1;">
                Tu paquete ya ha sido entregado a <strong style="color: #f8fafc;">MRW</strong> y está viajando hacia ti.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius: 12px; border: 1px solid rgba(56,189,248,0.45); background: linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(15,23,42,0.6) 100%); box-shadow: 0 0 32px rgba(56,189,248,0.12);">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #38bdf8;">Número de guía MRW</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.06em; color: #f8fafc; font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;">${safeTracking}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 36px 28px; text-align: center;">
              <a href="${escapeHtml(trackUrl)}" style="display: inline-block; padding: 16px 40px; font-size: 15px; font-weight: 600; color: #0f1117; background: linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%); border-radius: 12px; text-decoration: none; box-shadow: 0 8px 24px rgba(14,165,233,0.35);">Rastrear mi Paquete</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 36px 36px; text-align: center; border-top: 1px solid #2a2f3a;">
              <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.65; color: #94a3b8;">
                Somos <strong style="color: #e2e8f0;">tecnología premium</strong> en <strong style="color: #f8fafc;">Barquisimeto</strong>.
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; letter-spacing: 0.06em;">Conectados Contigo</p>
              <p style="margin: 0;">
                <a href="mailto:ventas@jummper.pro" style="color: #38bdf8; text-decoration: none; font-size: 13px;">ventas@jummper.pro</a>
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: #475569;">Mundo Tech · Venezuela</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envía el correo de envío cuando el pedido sale con MRW.
 * Solo debe llamarse desde el servidor. Errores se registran; no relanza.
 */
export async function sendShippingEmail(
  email: string,
  firstName: string,
  trackingNumber: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      '[shipping-email] RESEND_API_KEY no está configurada; se omite el envío para:',
      email
    );
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
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: '📦 ¡Buenas noticias! Tu pedido de Mundo Tech va en camino',
      html: buildShippingEmailHtml(trimmedName, trimmedTracking),
    });

    if (error) {
      console.error('[shipping-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[shipping-email] Excepción al enviar correo de envío a', trimmedEmail, err);
  }
}

/**
 * Envía el correo de bienvenida tras un registro exitoso.
 * Solo debe llamarse desde el servidor. Errores se registran; no relanza para no afectar el flujo de registro.
 */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      '[welcome-email] RESEND_API_KEY no está configurada; se omite el envío para:',
      email
    );
    return;
  }

  const trimmed = firstName.trim() || 'Cliente';

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: '¡Bienvenido a Mundo Tech!',
      html: buildWelcomeEmailHtml(trimmed),
    });

    if (error) {
      console.error('[welcome-email] Error de Resend al enviar a', email, error);
    }
  } catch (err) {
    console.error('[welcome-email] Excepción al enviar correo de bienvenida a', email, err);
  }
}
