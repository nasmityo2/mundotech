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
  lines.push(`🛒 *Nuevo pedido MundoTech #${input.orderRef}*`);
  lines.push('');
  lines.push(`👤 *Cliente:* ${input.customerName}`);
  if (input.idNumber?.trim()) lines.push(`🪪 *Cédula:* ${input.idNumber.trim()}`);
  lines.push(`📞 *Teléfono:* ${input.phone}`);
  lines.push(`🚚 *Empresa de envío:* ${input.shippingCompany}`);
  lines.push(`📍 *Entrega:* ${input.address}`);
  lines.push(`💳 *Método de pago:* ${input.paymentMethod}`);
  lines.push('');
  lines.push('*Productos:*');
  for (const item of input.items) {
    lines.push(`  • ${item.quantity}× ${item.name} — $${item.priceUsd.toFixed(2)}`);
  }
  lines.push('');
  const totalBs = input.totalUsd * input.rate;
  lines.push(`💰 *Total:* $${input.totalUsd.toFixed(2)} ≈ Bs. ${totalBs.toFixed(2)} (tasa: Bs. ${input.rate.toFixed(2)})`);
  lines.push('');
  lines.push('✅ *Pendiente de confirmación por MundoTech*');
  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizeWaPhone(phone)}?text=${encodeURIComponent(message)}`;
}
