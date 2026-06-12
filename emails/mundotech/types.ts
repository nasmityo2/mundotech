export type OrderConfirmationLineItem = {
  name: string;
  slug: string;
  image: string | null;
  priceUsd: number;
  quantity: number;
  variations?: Record<string, string> | string | null;
};

/**
 * Payload único para confirmación de pedido + envío por Resend.
 * Montos primarios en USD; tasa convierte a Bs.S para vista dual.
 * PRD-202: subtotalBs / shippingBs / totalBs son los montos Bs congelados
 * del pedido (calculados una sola vez con la tasa del momento de creación).
 * Cuando están presentes la plantilla los muestra directamente sin recalcular.
 */
export type OrderConfirmationPayload = {
  id: string;
  orderNumber: number;
  customerName: string;
  email: string;
  createdAt: Date;
  status: string;
  items: OrderConfirmationLineItem[];
  subtotalUsd: number;
  shippingUsd: number;
  totalUsd: number;
  /** PRD-202: monto Bs congelado al crear el pedido (sin conversión posterior). */
  subtotalBs?: number;
  /** PRD-202: envío en Bs congelado (0 para envío gratuito). */
  shippingBs?: number;
  /** PRD-202: total en Bs congelado al crear el pedido. */
  totalBs?: number;
  exchangeRateUsdBs: number | null;
  paymentMethod: string;
  paymentBank?: string | null;
  paymentReference?: string | null;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  customerPhone?: string | null;
  /** Ej. MRW, Zoom — en checkout suele ser null y se muestra texto neutro. */
  shippingMethod?: string | null;
};
