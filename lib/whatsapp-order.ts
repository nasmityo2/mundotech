// Secuencias UTF-8 de cada emoji, YA percent-encoded. Son ASCII puro en el
// fuente: el minificador no puede plegarlas a glifos, y se insertan tal cual en
// la URL (sin encodeURIComponent). Así es imposible que se corrompan a "�"
// durante build/serve, sin importar el charset del bundle o del servidor.
const EMOJI_ENC = {
  cart:    '%F0%9F%9B%92', // 🛒
  person:  '%F0%9F%91%A4', // 👤
  id:      '%F0%9F%86%94', // 🆔
  phone:   '%F0%9F%93%9E', // 📞
  truck:   '%F0%9F%9A%9A', // 🚚
  pin:     '%F0%9F%93%8D', // 📍
  card:    '%F0%9F%92%B3', // 💳
  money:   '%F0%9F%92%B0', // 💰
  pending: '%E2%9C%85',    // ✅
} as const;

type EmojiKey = keyof typeof EMOJI_ENC;

// Un segmento del mensaje: texto plano, o un marcador de emoji.
type WaSegment = { text: string } | { emoji: EmojiKey };

export type WhatsAppOrderInput = {
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
};

export function normalizeWaPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

// Construye el mensaje como lista de segmentos. Los emojis son marcadores, NUNCA
// glifos, así que este código fuente es ASCII puro salvo por acentos/símbolos
// BMP del texto (que sí sobreviven correctamente al build).
function buildOrderSegments(input: WhatsAppOrderInput): WaSegment[] {
  const seg: WaSegment[] = [];

  const t = (text: string) => seg.push({ text });
  const e = (emoji: EmojiKey) => seg.push({ emoji });
  const nl = () => t('\n');

  e('cart'); t(` *Nuevo pedido MundoTech #${input.orderRef}*`); nl(); nl();
  e('person'); t(` *Cliente:* ${input.customerName}`); nl();
  if (input.idNumber?.trim()) { e('id'); t(` *Cédula:* ${input.idNumber.trim()}`); nl(); }
  e('phone'); t(` *Teléfono:* ${input.phone}`); nl();
  e('truck'); t(` *Empresa de envío:* ${input.shippingCompany}`); nl();
  e('pin'); t(` *Entrega:* ${input.address}`); nl();
  e('card'); t(` *Método de pago:* ${input.paymentMethod}`); nl(); nl();

  t('*Productos:*'); nl();
  for (const item of input.items) {
    t(`  • ${item.quantity}× ${item.name} — $${item.priceUsd.toFixed(2)}`); nl();
  }
  nl();

  const totalBs = input.totalUsd * input.rate;
  e('money');
  t(` *Total:* $${input.totalUsd.toFixed(2)} ≈ Bs. ${totalBs.toFixed(2)} (tasa: Bs. ${input.rate.toFixed(2)})`);
  nl(); nl();

  e('pending'); t(' *Pendiente de confirmación por MundoTech*');

  return seg;
}

// Mensaje legible (con emojis reales vía decodeURIComponent sobre ASCII). Solo
// para logging/analytics; NO se usa para construir la URL.
export function buildWhatsAppOrderMessage(input: WhatsAppOrderInput): string {
  return buildOrderSegments(input)
    .map((s) => ('text' in s ? s.text : decodeURIComponent(EMOJI_ENC[s.emoji])))
    .join('');
}

// Texto para el parámetro ?text= de wa.me, YA percent-encoded y 100% ASCII.
// - El texto plano se codifica con encodeURIComponent en runtime.
// - Los emojis se insertan como sus secuencias %XX literales (sin re-encodear).
export function buildWhatsAppOrderText(input: WhatsAppOrderInput): string {
  return buildOrderSegments(input)
    .map((s) => ('text' in s ? encodeURIComponent(s.text) : EMOJI_ENC[s.emoji]))
    .join('');
}

// URL final para api.whatsapp.com/send. Se arma manualmente porque el text YA
// está percent-encoded: NO uses URL/URLSearchParams aquí, porque re-codificarían
// los % (doble encode). Usamos api.whatsapp.com en vez de wa.me porque wa.me
// corrompe los emojis en el redirect 302.
export function buildWhatsAppOrderUrl(phone: string, input: WhatsAppOrderInput): string {
  const normalizedPhone = normalizeWaPhone(phone);

  if (!normalizedPhone) {
    throw new Error('WhatsApp order phone is required');
  }

  return `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${buildWhatsAppOrderText(input)}`;
}
