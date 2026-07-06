// Emojis construidos en runtime desde su code point (números puros): así el
// minificador NO los colapsa a glifos literales y no se corrompen al servirse.
const EMOJI = {
  cart:   String.fromCodePoint(0x1F6D2), // 🛒
  person: String.fromCodePoint(0x1F464), // 👤
  id:     String.fromCodePoint(0x1F194), // 🆔
  phone:  String.fromCodePoint(0x1F4DE), // 📞
  truck:  String.fromCodePoint(0x1F69A), // 🚚
  pin:    String.fromCodePoint(0x1F4CD), // 📍
  card:   String.fromCodePoint(0x1F4B3), // 💳
  money:  String.fromCodePoint(0x1F4B0), // 💰
  check:  String.fromCodePoint(0x2705),  // ✅
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
