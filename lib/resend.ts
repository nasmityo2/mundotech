import { Resend } from 'resend';
import { getOrderDualMoney, hasFrozenBsPricing } from '@/lib/order-pricing';

const FROM_ADDRESS = 'Mundo Tech <ventas@jummper.pro>';

/** Paleta MundoTech — correo claro retail (alineado con web; sin cyan). */
const PAGE_BG = '#F1F5F9';
const CARD_BG = '#FFFFFF';
const BORDER = '#E2E8F0';
const NAVY = '#0B1220';
const GOLD = '#FFD700';
const GOLD_MID = '#FFE03A';
const SUCCESS = '#48BB78';
const TEXT_MUTED = '#64748b';
const TEXT_SECONDARY = '#475569';
const TABLE_HEAD = '#F8FAFC';

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

function siteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://mundotech.com.ve';
}

function contactEmailRaw(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'ventas@jummper.pro';
}

/** Estilos mínimos para padding responsivo (clientes que respetan @media). */
function emailHead(title: string): string {
  const safeTitle = escapeHtml(title);
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle}</title>
  <!--[if mso]><style type="text/css">table, td { border-collapse: collapse; }</style><![endif]-->
  <style type="text/css">
    @media only screen and (min-width: 600px) {
      .mt-pad-x { padding-left: 32px !important; padding-right: 32px !important; }
      .mt-pad-h { padding-top: 28px !important; padding-bottom: 28px !important; }
    }
    @media only screen and (max-width: 599px) {
      .mt-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>`;
}

function brandMarkHtml(): string {
  return `<span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${NAVY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">Mundo<span style="color:${GOLD};">Tech</span></span>`;
}

function emailHeader(): string {
  return `
          <tr>
            <td class="mt-pad-x mt-pad-h" style="padding:24px 16px 20px;text-align:center;background:${CARD_BG};border-bottom:1px solid ${BORDER};">
              <p style="margin:0 0 8px;">${brandMarkHtml()}</p>
              <p style="margin:0;font-size:13px;color:${TEXT_MUTED};letter-spacing:0.02em;">Conectados Contigo</p>
            </td>
          </tr>`;
}

function emailFooter(): string {
  const mail = escapeHtml(contactEmailRaw());
  const mailto = escapeHtml(`mailto:${contactEmailRaw()}`);
  return `
          <tr>
            <td class="mt-pad-x" style="padding:28px 16px 32px;text-align:center;background:${CARD_BG};border-top:1px solid ${BORDER};">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:${TEXT_MUTED};">
                Tecnología premium en <strong style="color:${TEXT_SECONDARY};">Barquisimeto</strong>
              </p>
              <p style="margin:0 0 12px;">
                <a href="${mailto}" style="color:${GOLD};font-weight:600;text-decoration:none;font-size:14px;">${mail}</a>
              </p>
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">MundoTech · Conectados Contigo</p>
            </td>
          </tr>`;
}

function statusBadge(text: string, tone: 'neutral' | 'success'): string {
  const safe = escapeHtml(text);
  const bg = tone === 'success' ? '#ECFDF5' : '#F1F5F9';
  const fg = tone === 'success' ? SUCCESS : NAVY;
  return `<span style="display:inline-block;padding:6px 14px;font-size:12px;font-weight:600;color:${fg};background:${bg};border-radius:999px;">${safe}</span>`;
}

/** Botón primario: amarillo marca; “hover” simulado vía color intermedio en borde sutil (solo visual fijo en email). */
function ctaButton(href: string, label: string): string {
  const h = escapeHtml(href);
  const l = escapeHtml(label);
  return `
            <tr>
              <td class="mt-pad-x" style="padding:8px 16px 8px;text-align:center;">
                <a class="mt-btn" href="${h}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${NAVY};background-color:${GOLD};border-radius:12px;text-decoration:none;border:1px solid ${GOLD_MID};min-width:200px;box-sizing:border-box;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">${l}</a>
              </td>
            </tr>`;
}

function ctaButtonSecondary(href: string, label: string): string {
  const h = escapeHtml(href);
  const l = escapeHtml(label);
  return `
            <tr>
              <td class="mt-pad-x" style="padding:4px 16px 16px;text-align:center;">
                <a class="mt-btn" href="${h}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:${NAVY};background-color:${TABLE_HEAD};border-radius:12px;text-decoration:none;border:1px solid ${BORDER};min-width:200px;box-sizing:border-box;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">${l}</a>
              </td>
            </tr>`;
}

function wrapEmail(title: string, innerRows: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>${emailHead(title)}
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="background-color:${CARD_BG};border-radius:20px;border:1px solid ${BORDER};overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
${emailHeader()}
${innerRows}
${emailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      return `${escapeHtml(d.bs)}<br/><span style="font-size:12px;color:${TEXT_MUTED};">${escapeHtml(d.usd)}</span>`;
    }
    return `<span style="color:${NAVY};font-weight:600;">${escapeHtml(d.usd)}</span>`;
  };

  const rowsHtml = detail.items
    .map((item) => {
      const line = item.price * item.quantity;
      return `
                <tr>
                  <td style="padding:12px 10px;border-bottom:1px solid ${BORDER};color:${NAVY};font-size:14px;">
                    ${escapeHtml(item.productName)}
                  </td>
                  <td style="padding:12px 10px;border-bottom:1px solid ${BORDER};color:${TEXT_MUTED};font-size:13px;text-align:center;">
                    ${item.quantity}
                  </td>
                  <td style="padding:12px 10px;border-bottom:1px solid ${BORDER};color:${TEXT_MUTED};font-size:13px;text-align:right;line-height:1.35;">
                    ${dualMoneyCells(item.price)}
                  </td>
                  <td style="padding:12px 10px;border-bottom:1px solid ${BORDER};color:${NAVY};font-size:13px;text-align:right;line-height:1.35;font-weight:700;">
                    ${dualMoneyCells(line)}
                  </td>
                </tr>`;
    })
    .join('');

  const rateNote =
    detail.exchangeRateUsdBs != null && detail.exchangeRateUsdBs > 0
      ? `<p style="margin:12px 0 0;font-size:12px;color:${TEXT_MUTED};"><strong style="color:${TEXT_SECONDARY};">Tasa registrada en este pedido (no cambia):</strong> Bs. ${escapeHtml(detail.exchangeRateUsdBs.toFixed(2))} / USD. Los montos anteriores son los que pagaste en ese momento.</p>`
      : `<p style="margin:12px 0 0;font-size:12px;color:${TEXT_MUTED};">Montos en dólares (USD); pedido anterior al registro de tasa en el sistema.</p>`;

  const orderUrl = `${siteBaseUrl()}/account/orders/${encodeURIComponent(detail.orderId)}`;

  const payExtras =
    (safeBank
      ? `<p style="margin:6px 0 0;font-size:13px;color:${TEXT_MUTED};">Banco: <strong style="color:${NAVY};">${safeBank}</strong></p>`
      : '') +
    (safeRef
      ? `<p style="margin:6px 0 0;font-size:13px;color:${TEXT_MUTED};">Referencia: <strong style="color:${NAVY};">${safeRef}</strong></p>`
      : '');

  const inner = `
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px 8px;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:${NAVY};">Hola <strong style="color:${NAVY};">${safeName}</strong>,</p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:${TEXT_SECONDARY};">
                Gracias por tu compra en <strong style="color:${NAVY};">MundoTech</strong>. Aquí tienes el resumen del pedido <strong style="color:${NAVY};">#${safeOrderNo}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;background:${TABLE_HEAD};">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_MUTED};">Resumen</p>
                    <p style="margin:0 0 6px;font-size:13px;color:${TEXT_SECONDARY};">${safeWhen}</p>
                    <p style="margin:12px 0 0;">${statusBadge(detail.status, 'neutral')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mt-pad-x" style="padding:12px 16px 8px;">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${TEXT_MUTED};">Productos</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;background:${CARD_BG};">
                <thead>
                  <tr style="background:${TABLE_HEAD};">
                    <th align="left" style="padding:12px 10px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${TEXT_SECONDARY};border-bottom:1px solid ${BORDER};">Artículo</th>
                    <th style="padding:12px 10px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${TEXT_SECONDARY};border-bottom:1px solid ${BORDER};">Cant.</th>
                    <th align="right" style="padding:12px 10px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${TEXT_SECONDARY};border-bottom:1px solid ${BORDER};">P. unit.<br/><span style="font-weight:400;font-size:10px;">Bs. / USD</span></th>
                    <th align="right" style="padding:12px 10px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${TEXT_SECONDARY};border-bottom:1px solid ${BORDER};">Subtotal<br/><span style="font-weight:400;font-size:10px;">Bs. / USD</span></th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                  <tr style="background:${TABLE_HEAD};">
                    <td colspan="3" style="padding:16px 10px;text-align:right;font-size:15px;font-weight:700;color:${NAVY};border-top:1px solid ${BORDER};">Total</td>
                    <td style="padding:16px 10px;text-align:right;font-size:16px;font-weight:700;color:${NAVY};border-top:1px solid ${BORDER};line-height:1.35;">
                      ${dualMoneyCells(detail.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
              ${rateNote}
            </td>
          </tr>
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${TEXT_MUTED};">Envío</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT_SECONDARY};">${safeAddr}</p>
              <p style="margin:6px 0 0;font-size:13px;color:${TEXT_MUTED};">${safeCity}, ${safeState} · C.P. ${safeZip} · ${safeCountry}</p>
              ${safePhone ? `<p style="margin:8px 0 0;font-size:13px;color:${TEXT_MUTED};">Tel: <span style="color:${NAVY};">${safePhone}</span></p>` : ''}
            </td>
          </tr>
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px 16px;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${TEXT_MUTED};">Pago</p>
              <p style="margin:0;font-size:14px;color:${NAVY};"><strong>${safePay}</strong></p>
              ${payExtras}
            </td>
          </tr>
          ${ctaButton(orderUrl, 'Ver pedido')}`;

  return wrapEmail(`Pedido #${safeOrderNo}`, inner);
}

function buildPaymentValidatedEmailHtml(firstName: string, orderDisplayId: string, orderUuid?: string): string {
  const safeName = escapeHtml(firstName);
  const safeOrderRef = escapeHtml(orderDisplayId);
  const ordersPath = orderUuid
    ? `${siteBaseUrl()}/account/orders/${encodeURIComponent(orderUuid)}`
    : `${siteBaseUrl()}/account/orders`;

  const inner = `
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px 8px;">
              <p style="margin:0 0 16px;">${statusBadge('Pago verificado', 'success')}</p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:${NAVY};">Hola <strong style="color:${NAVY};">${safeName}</strong>,</p>
              <p style="margin:16px 0 0;font-size:18px;line-height:1.45;color:${NAVY};font-weight:700;">
                Tu pago fue verificado correctamente
              </p>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:${TEXT_SECONDARY};">
                Hemos confirmado el pago del pedido <strong style="color:${NAVY};">#${safeOrderRef}</strong>. Ya estamos preparando tu envío con el mayor cuidado.
              </p>
            </td>
          </tr>
          ${ctaButton(ordersPath, 'Ver pedido')}`;

  return wrapEmail('Pago confirmado — MundoTech', inner);
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
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: 'MundoTech · Pago confirmado — tu pedido va en preparación',
      html: buildPaymentValidatedEmailHtml(trimmedName, trimmedOrderRef, orderUuid),
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
      subject: `MundoTech · Pedido #${subjNo} recibido`,
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
  const shopUrl = `${siteBaseUrl()}/productos`;

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
            <td class="mt-pad-x" style="padding:8px 16px 16px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${TEXT_MUTED};">Síguenos</p>
              <p style="margin:0;font-size:13px;line-height:2;">
                ${socialLinks
                  .map(
                    (l) =>
                      `<a href="${escapeHtml(l.url)}" style="color:${GOLD};font-weight:600;text-decoration:none;margin:0 8px;">${escapeHtml(l.label)}</a>`
                  )
                  .join(' ')}
              </p>
            </td>
          </tr>`;

  const inner = `
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px 8px;">
              <p style="margin:0 0 12px;font-size:20px;line-height:1.35;color:${NAVY};font-weight:700;">Bienvenido a MundoTech</p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:${NAVY};">Hola <strong style="color:${NAVY};">${safeName}</strong>,</p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.75;color:${TEXT_SECONDARY};">
                Gracias por registrarte. Somos tu tienda de tecnología en <strong style="color:${NAVY};">Barquisimeto</strong>: stock real, soporte cercano y pedidos con respaldo.
              </p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.75;color:${TEXT_SECONDARY};">
                Explora nuestro catálogo y compra con la tranquilidad de una marca local seria.
              </p>
            </td>
          </tr>
          ${ctaButton(shopUrl, 'Explorar productos')}
          ${socialRow}`;

  return wrapEmail('Bienvenido a MundoTech', inner);
}

export type ShippingEmailOptions = {
  carrier?: string | null;
  trackingUrl?: string | null;
  orderId?: string | null;
};

function buildShippingEmailHtml(
  firstName: string,
  trackingNumber: string,
  opts?: ShippingEmailOptions
): string {
  const safeName = escapeHtml(firstName);
  const safeTracking = escapeHtml(trackingNumber.trim());
  const carrierRaw = opts?.carrier?.trim() || 'Tu transportista';
  const safeCarrier = escapeHtml(carrierRaw);
  const explicitUrl = opts?.trackingUrl?.trim();
  const orderId = opts?.orderId?.trim();
  const trackHref =
    explicitUrl && /^https?:\/\//i.test(explicitUrl)
      ? explicitUrl
      : orderId
        ? `${siteBaseUrl()}/account/orders/${encodeURIComponent(orderId)}`
        : `${siteBaseUrl()}/account/orders`;
  const ctaLabel = explicitUrl && /^https?:\/\//i.test(explicitUrl) ? 'Rastrear envío' : 'Ver pedido';

  const inner = `
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px 8px;">
              <p style="margin:0 0 12px;">${statusBadge('Enviado', 'neutral')}</p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:${NAVY};">¡Hola <strong style="color:${NAVY};">${safeName}</strong>!</p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:${TEXT_SECONDARY};">
                Tu pedido salió con <strong style="color:${NAVY};">${safeCarrier}</strong>. Usa el número de seguimiento para ver el estado del envío.
              </p>
            </td>
          </tr>
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BORDER};border-radius:12px;background:${TABLE_HEAD};">
                <tr>
                  <td style="padding:20px 18px;">
                    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${TEXT_MUTED};">Guía / tracking</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:${NAVY};letter-spacing:0.03em;font-family:ui-monospace,'Segoe UI Mono',Consolas,monospace;">${safeTracking}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${ctaButton(trackHref, ctaLabel)}`;

  return wrapEmail('Tu pedido va en camino — MundoTech', inner);
}

function buildOrderDeliveredEmailHtml(firstName: string, orderUuid: string): string {
  const safeName = escapeHtml(firstName);
  const orderUrl = `${siteBaseUrl()}/account/orders/${encodeURIComponent(orderUuid)}`;
  const shopUrl = `${siteBaseUrl()}/productos`;

  const inner = `
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px 8px;">
              <p style="margin:0 0 16px;">${statusBadge('Entregado', 'success')}</p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:${NAVY};">Hola <strong style="color:${NAVY};">${safeName}</strong>,</p>
              <p style="margin:16px 0 0;font-size:18px;line-height:1.45;color:${NAVY};font-weight:700;">
                Tu pedido fue entregado
              </p>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:${TEXT_SECONDARY};">
                Esperamos que disfrutes tu compra. Si necesitas ayuda con garantía o accesorios, escríbenos.
              </p>
            </td>
          </tr>
          ${ctaButton(orderUrl, 'Ver pedido')}
          ${ctaButtonSecondary(shopUrl, 'Comprar nuevamente')}`;

  return wrapEmail('Pedido entregado — MundoTech', inner);
}

/**
 * Envía el correo de envío cuando el pedido sale con guía.
 * Solo debe llamarse desde el servidor. Errores se registran; no relanza.
 */
export async function sendShippingEmail(
  email: string,
  firstName: string,
  trackingNumber: string,
  opts?: ShippingEmailOptions
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
      subject: 'MundoTech · Tu pedido va en camino',
      html: buildShippingEmailHtml(trimmedName, trimmedTracking, opts),
    });

    if (error) {
      console.error('[shipping-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[shipping-email] Excepción al enviar correo de envío a', trimmedEmail, err);
  }
}

/**
 * Notificación de pedido marcado como entregado en admin.
 */
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
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: 'MundoTech · Tu pedido fue entregado',
      html: buildOrderDeliveredEmailHtml(trimmedName, id),
    });

    if (error) {
      console.error('[order-delivered-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[order-delivered-email] Excepción al enviar a', trimmedEmail, err);
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
      subject: 'Bienvenido a MundoTech',
      html: buildWelcomeEmailHtml(trimmed),
    });

    if (error) {
      console.error('[welcome-email] Error de Resend al enviar a', email, error);
    }
  } catch (err) {
    console.error('[welcome-email] Excepción al enviar correo de bienvenida a', email, err);
  }
}

function buildPasswordResetEmailHtml(resetUrl: string): string {
  const displayUrl = escapeHtml(resetUrl);

  const inner = `
          <tr>
            <td class="mt-pad-x" style="padding:8px 16px 8px;">
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.06em;">Seguridad</p>
              <p style="margin:0;font-size:16px;line-height:1.65;color:${TEXT_SECONDARY};">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong style="color:${NAVY};">MundoTech</strong>. Si fuiste tú, pulsa el botón para elegir una nueva clave.
              </p>
              <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:${TEXT_MUTED};">
                Si no solicitaste este cambio, ignora este mensaje. Nadie podrá cambiar tu contraseña sin acceso a tu correo.
              </p>
            </td>
          </tr>
          ${ctaButton(resetUrl, 'Restablecer contraseña')}
          <tr>
            <td class="mt-pad-x" style="padding:0 16px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.55;color:${TEXT_MUTED};word-break:break-all;">
                ¿El botón no funciona? Copia y pega en el navegador:<br/>
                <span style="color:${TEXT_SECONDARY};">${displayUrl}</span>
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:${TEXT_MUTED};">El enlace expira en 15 minutos.</p>
            </td>
          </tr>`;

  return wrapEmail('Restablecer contraseña · MundoTech', inner);
}

/**
 * Correo de recuperación de contraseña. Errores se registran; no relanza.
 */
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

  const resetUrl = `${siteBaseUrl()}/reset-password?token=${encodeURIComponent(token.trim())}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: trimmedEmail,
      subject: 'MundoTech · Restablecer tu contraseña',
      html: buildPasswordResetEmailHtml(resetUrl),
    });

    if (error) {
      console.error('[password-reset-email] Error de Resend al enviar a', trimmedEmail, error);
    }
  } catch (err) {
    console.error('[password-reset-email] Excepción al enviar a', trimmedEmail, err);
  }
}
