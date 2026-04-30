import { Resend } from 'resend';

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
                Nos alegra darte la bienvenida. Estamos cerca de ti en <strong style="color: #f8fafc;">Barquisimeto</strong> y <strong style="color: #f8fafc;">Yaritagua</strong>, acompañando tu experiencia tech con el mismo cuidado en tienda y en línea.
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
                Somos <strong style="color: #e2e8f0;">tecnología premium</strong> en <strong style="color: #f8fafc;">Barquisimeto</strong> y <strong style="color: #f8fafc;">Yaritagua</strong>.
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
