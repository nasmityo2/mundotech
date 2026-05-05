import type { Order, OrderStatus } from '@/lib/definitions';

/**
 * Estados con pago validado (ingresos reales). Excluye pendientes y cancelados.
 * Equivale a PAID + pipeline + COMPLETED en flujo típico.
 */
export const VALIDATED_REVENUE_STATUSES: readonly OrderStatus[] = [
  'En Proceso',
  'Enviado',
  'Entregado',
] as const;

export function orderCountsTowardValidatedRevenue(status: OrderStatus): boolean {
  return (VALIDATED_REVENUE_STATUSES as readonly string[]).includes(status);
}

/**
 * Fecha usada para agrupar ventas validadas por período: día de pago real si existe; si no, creado (legado).
 */
export function orderAnalyticsPeriodDate(order: Pick<Order, 'createdAt' | 'paidAt'>): Date {
  if (order.paidAt) return new Date(order.paidAt);
  return new Date(order.createdAt);
}

/**
 * Total almacenado en el pedido (Bs con tasa registrada al comprar o USD legado). No aplicar tasa actual del sitio.
 */
export function orderStoredRevenueTotal(order: Pick<Order, 'total'>): number {
  return order.total;
}
