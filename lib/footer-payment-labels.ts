/**
 * Etiquetas públicas de métodos de pago para el footer.
 * Unión de canales web + WhatsApp sin exponer datos privados.
 */
import {
  buildCheckoutPaymentMethods,
  type PaymentSettingsSlice,
} from '@/lib/payment-methods';

/**
 * Une métodos activos disponibles en web y/o WhatsApp por id.
 * Orden estable: primero aparición según sortOrder resuelto por los builders.
 */
export function buildFooterPaymentMethodLabels(
  settings: PaymentSettingsSlice,
): string[] {
  const web = buildCheckoutPaymentMethods(settings, 'web');
  const whatsapp = buildCheckoutPaymentMethods(settings, 'whatsapp');

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const method of [...web, ...whatsapp]) {
    if (seen.has(method.id)) continue;
    seen.add(method.id);
    const name = method.name.trim();
    if (!name) continue;
    labels.push(name);
  }

  return labels;
}
