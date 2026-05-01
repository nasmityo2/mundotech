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
 * Montos en USD; la tasa convierte a Bs.S para la vista dual.
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
