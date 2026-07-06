export type CheckoutMode = 'whatsapp' | 'full';

export const CHECKOUT_MODE: CheckoutMode =
  (process.env.NEXT_PUBLIC_CHECKOUT_MODE as CheckoutMode | undefined) ?? 'whatsapp';

export const isWhatsAppCheckout = CHECKOUT_MODE === 'whatsapp';
