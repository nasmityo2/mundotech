import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppPhone, isValidWhatsAppPhone } from '@/lib/whatsapp-phone';

describe('normalizeWhatsAppPhone', () => {
  it('deja solo dígitos, sin espacios/guiones/+', () => {
    expect(normalizeWhatsAppPhone('+58 412-147-1338')).toBe('584121471338');
  });

  it('vacío se mantiene vacío', () => {
    expect(normalizeWhatsAppPhone('')).toBe('');
  });

  it('quita letras y símbolos', () => {
    expect(normalizeWhatsAppPhone('abc58-412-147-1338!')).toBe('584121471338');
  });
});

describe('isValidWhatsAppPhone', () => {
  it('acepta el formato internacional venezolano completo', () => {
    expect(isValidWhatsAppPhone('584121471338')).toBe(true);
  });

  it('acepta con símbolos, ya que normaliza internamente', () => {
    expect(isValidWhatsAppPhone('+58 412-147-1338')).toBe(true);
  });

  it('rechaza vacío', () => {
    expect(isValidWhatsAppPhone('')).toBe(false);
  });

  it('rechaza número local sin prefijo de país (0412…)', () => {
    expect(isValidWhatsAppPhone('04121471338')).toBe(false);
  });

  it('rechaza letras (normaliza a cadena inválida)', () => {
    expect(isValidWhatsAppPhone('abcdefghij')).toBe(false);
  });

  it('rechaza menos de 10 dígitos', () => {
    expect(isValidWhatsAppPhone('581234567')).toBe(false);
  });

  it('rechaza más de 15 dígitos', () => {
    expect(isValidWhatsAppPhone('5841214713381234')).toBe(false);
  });

  it('rechaza un número que no empieza con prefijo 58', () => {
    expect(isValidWhatsAppPhone('14121471338')).toBe(false);
  });
});
