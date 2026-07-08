// Emojis generados en runtime desde UTF-8 percent-encoded (solo ASCII en el
// fuente). Así el minificador NO los pliega a glifos literales y es imposible
// que se corrompan a "�" al buildear/servir. decodeURIComponent los vuelve
// emoji real en el navegador; luego encodeURIComponent(message) los re-codifica.
const EMOJI = {
  cart:   decodeURIComponent('%F0%9F%9B%92'), // 🛒
  person: decodeURIComponent('%F0%9F%91%A4'), // 👤
  id:     decodeURIComponent('%F0%9F%86%94'), // 🆔
  phone:  decodeURIComponent('%F0%9F%93%9E'), // 📞
  truck:  decodeURIComponent('%F0%9F%9A%9A'), // 🚚
  pin:    decodeURIComponent('%F0%9F%93%8D'), // 📍
  card:   decodeURIComponent('%F0%9F%92%B3'), // 💳
  money:  decodeURIComponent('%F0%9F%92%B0'), // 💰
  check:  decodeURIComponent('%E2%9C%85'),    // ✅
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
  if (input.idNumber?.trim()) lines.push(`${EMOJI.id} *Cédula:* ${input.idNumber.trim()}`);
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
  lines.push(`${EMOJI.check} *Pendiente de confirmación por MundoTech*`);
  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizeWaPhone(phone)}?text=${encodeURIComponent(message)}`;
}
