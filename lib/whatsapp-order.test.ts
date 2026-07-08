import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  normalizeWaPhone,
} from './whatsapp-order';

function getTextParam(url: string): string {
  const parsed = new URL(url);
  const text = parsed.searchParams.get('text');
  if (!text) {
    throw new Error('Missing WhatsApp text param');
  }
  return text;
}

describe('whatsapp-order', () => {
  it('normalizes WhatsApp phone numbers', () => {
    expect(normalizeWaPhone('+58 412-147-1338')).toBe('584121471338');
    expect(normalizeWaPhone('0412 147 1338')).toBe('04121471338');
    expect(normalizeWaPhone('')).toBe('');
  });

  it('builds a Unicode-safe WhatsApp order message with emojis', () => {
    const message = buildWhatsAppOrderMessage({
      orderRef: '0026',
      customerName: 'Hhhh Hjjj',
      idNumber: 'V-555',
      phone: '04128515930',
      address: 'Retiro en tienda',
      shippingCompany: 'Retiro en tienda',
      paymentMethod: 'Pago Móvil',
      items: [
        {
          name: 'Intercomunicador Bluetooth Q58 Max para Casco de Moto',
          quantity: 2,
          priceUsd: 10.8,
        },
      ],
      totalUsd: 21.6,
      rate: 685.94,
    });

    expect(message).toContain('\u{1F6D2}');
    expect(message).toContain('*Nuevo pedido MundoTech #0026*');
    expect(message).toContain('\u{1F464}');
    expect(message).toContain('*Cliente:* Hhhh Hjjj');
    expect(message).toContain('\u{1FAAA}');
    expect(message).toContain('*Cédula:* V-555');
    expect(message).toContain('\u{1F4F1}');
    expect(message).toContain('*Teléfono:* 04128515930');
    expect(message).toContain('\u{1F69A}');
    expect(message).toContain('*Empresa de envío:* Retiro en tienda');
    expect(message).toContain('\u{1F4CD}');
    expect(message).toContain('*Entrega:* Retiro en tienda');
    expect(message).toContain('\u{1F4B3}');
    expect(message).toContain('*Método de pago:* Pago Móvil');
    expect(message).toContain('• 2× Intercomunicador Bluetooth Q58 Max para Casco de Moto — $10.80');
    expect(message).toContain('\u{1F4B0}');
    expect(message).toContain('*Total:* $21.60 ≈ Bs. 14816.30 (tasa: Bs. 685.94)');
    expect(message).toContain('\u{23F3}');
    expect(message).toContain('*Pendiente de confirmación por MundoTech*');
    expect(message).not.toContain('\uFFFD');
    expect(message).not.toContain('%u');
  });

  it('builds a WhatsApp URL with UTF-8 encoded text param', () => {
    const message = buildWhatsAppOrderMessage({
      orderRef: '0026',
      customerName: 'Hhhh Hjjj',
      idNumber: 'V-555',
      phone: '04128515930',
      address: 'Retiro en tienda',
      shippingCompany: 'Retiro en tienda',
      paymentMethod: 'Pago Móvil',
      items: [
        {
          name: 'Intercomunicador Bluetooth Q58 Max para Casco de Moto',
          quantity: 2,
          priceUsd: 10.8,
        },
      ],
      totalUsd: 21.6,
      rate: 685.94,
    });

    const url = buildWhatsAppOrderUrl('+58 412-147-1338', message);
    const parsed = new URL(url);
    const decodedText = getTextParam(url);

    expect(parsed.origin).toBe('https://wa.me');
    expect(parsed.pathname).toBe('/584121471338');
    expect(url).not.toContain('�');
    expect(url).not.toContain('%u');
    expect(url).toContain('%F0%9F%9B%92');  // 🛒
    expect(url).toContain('%F0%9F%91%A4');  // 👤
    expect(url).toContain('%F0%9F%AA%AA');  // 🪪
    expect(url).toContain('%F0%9F%93%B1');  // 📱
    expect(url).toContain('%F0%9F%92%B0');  // 💰
    expect(url).toContain('%E2%8F%B3');      // ⏳

    expect(decodedText).toContain('\u{1F6D2}');
    expect(decodedText).toContain('*Nuevo pedido MundoTech #0026*');
    expect(decodedText).toContain('\u{1F464}');
    expect(decodedText).toContain('*Cliente:* Hhhh Hjjj');
    expect(decodedText).toContain('\u{1FAAA}');
    expect(decodedText).toContain('*Cédula:* V-555');
    expect(decodedText).toContain('*Total:* $21.60');
    expect(decodedText).toContain('\u{23F3}');
    expect(decodedText).toContain('*Pendiente de confirmación por MundoTech*');
    expect(decodedText).not.toContain('\uFFFD');
  });

  it('throws when building a WhatsApp URL without phone', () => {
    expect(() => buildWhatsAppOrderUrl('', 'test')).toThrow('WhatsApp order phone is required');
  });
});
