/**
 * whatsapp-phone.ts
 * Normalización y validación del número de WhatsApp de pedidos
 * (`StoreSettings.whatsappOrderPhone`). No construye URLs — eso vive en
 * `lib/whatsapp-order.ts`.
 */

/** Solo dígitos, sin espacios/guiones/símbolos ni prefijo "+". */
export function normalizeWhatsAppPhone(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Formato internacional: 10 a 15 dígitos, primer dígito 1-9 (E.164 no
 * permite 0 al inicio). Para la configuración actual de Venezuela se exige
 * además el prefijo de país 58 cuando el valor no está vacío — evita que se
 * guarde un número local (`0412…`) que no funciona con wa.me/api.whatsapp.com.
 */
export function isValidWhatsAppPhone(raw: string): boolean {
  const digits = normalizeWhatsAppPhone(raw);
  if (digits.length < 10 || digits.length > 15) return false;
  if (!/^[1-9]\d+$/.test(digits)) return false;
  return digits.startsWith('58');
}
