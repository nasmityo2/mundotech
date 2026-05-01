import { formatCurrency } from '@/lib/utils';

function formatVES(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export type OrderWithPricingMeta = { exchangeRateUsdBs?: number | null };

/**
 * Montos guardados en pedidos **nuevos**: bolívares (tasa aplicada en checkout).
 * Pedidos **legacy** (sin `exchangeRateUsdBs`): USD en BD; se muestran como USD.
 */
export function formatStoredOrderMoney(amount: number, order: OrderWithPricingMeta): string {
  if (order.exchangeRateUsdBs != null && order.exchangeRateUsdBs > 0) {
    return formatVES(amount);
  }
  return formatCurrency(amount, 'USD', 'en-US');
}
