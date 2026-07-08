/** Carácter de reemplazo Unicode (�) usado como canario de detección de
 * corrupción de encoding. Se construye vía escape para no tener glifos
 * literales en el fuente. */
const REPLACEMENT_CHARACTER = '\uFFFD';

/** Emojis definidos como escapes Unicode ASCII-safe (\u{...}). Ni emojis
 * literales, ni decodeURIComponent. El runtime los produce correctamente y
 * encodeURIComponent los codifica como UTF-8 percent-encoded. */
const EMOJI = {
  cart:   '\u{1F6D2}',
  person: '\u{1F464}',
  id:     '\u{1FAAA}',
  phone:  '\u{1F4F1}',
  truck:  '\u{1F69A}',
  pin:    '\u{1F4CD}',
  card:   '\u{1F4B3}',
  money:  '\u{1F4B0}',
  pending:'\u{23F3}',
} as const;

export function normalizeWaPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function buildWhatsAppOrderMessage(input: {
  orderRef: string;
  customerName: string;
  idNumber?: string;
  phone: string;
  address: string;
  shippingCompany: string;
  paymentMethod: string;
  items: { name: string; quantity: number; priceUsd: number }[];
  totalUsd: number;
  rate: number;
}): string {
  const lines: string[] = [];

  lines.push(`${EMOJI.cart} *Nuevo pedido MundoTech #${input.orderRef}*`);
  lines.push('');
  lines.push(`${EMOJI.person} *Cliente:* ${input.customerName}`);
  if (input.idNumber?.trim()) {
    lines.push(`${EMOJI.id} *Cédula:* ${input.idNumber.trim()}`);
  }
  lines.push(`${EMOJI.phone} *Teléfono:* ${input.phone}`);
  lines.push(`${EMOJI.truck} *Empresa de envío:* ${input.shippingCompany}`);
  lines.push(`${EMOJI.pin} *Entrega:* ${input.address}`);
  lines.push(`${EMOJI.card} *Método de pago:* ${input.paymentMethod}`);
  lines.push('');
  lines.push('*Productos:*');
  for (const item of input.items) {
    lines.push(`  • ${item.quantity}× ${item.name} — $${item.priceUsd.toFixed(2)}`);
  }
  lines.push('');
  const totalBs = input.totalUsd * input.rate;
  lines.push(`${EMOJI.money} *Total:* $${input.totalUsd.toFixed(2)} ≈ Bs. ${totalBs.toFixed(2)} (tasa: Bs. ${input.rate.toFixed(2)})`);
  lines.push('');
  lines.push(`${EMOJI.pending} *Pendiente de confirmación por MundoTech*`);

  const message = lines.join('\n');

  if (message.includes(REPLACEMENT_CHARACTER)) {
    console.error('[whatsapp-order] Message contains Unicode replacement character before URL encoding', {
      orderRef: input.orderRef,
      message,
    });
  }

  return message;
}

export function buildWhatsAppOrderUrl(phone: string, message: string): string {
  const normalizedPhone = normalizeWaPhone(phone);

  if (!normalizedPhone) {
    throw new Error('WhatsApp order phone is required');
  }

  if (message.includes(REPLACEMENT_CHARACTER)) {
    console.error('[whatsapp-order] Refusing to silently encode corrupted WhatsApp message', {
      normalizedPhone,
      message,
    });
  }

  const url = new URL(`https://wa.me/${normalizedPhone}`);
  url.searchParams.set('text', message);
  return url.toString();
}
