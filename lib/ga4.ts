/**
 * FASE 4.4 (MEJORA 3.1) — helper central de eventos GA4 de e-commerce.
 *
 * - No-op total si NEXT_PUBLIC_GA4_ID no está configurado o gtag no cargó
 *   (el sitio funciona igual sin la variable).
 * - Respeta Consent Mode v2 (PRD-286): gtag.js se inicializa en
 *   CookieConsent.tsx con todo denegado por defecto; los eventos que pasan por
 *   gtag quedan bajo ese consentimiento (cookieless pings si el usuario no
 *   aceptó — nunca se setean cookies sin permiso).
 * - Moneda: los precios del catálogo son USD.
 *
 * Eventos estándar cableados:
 *   view_item          → PDP (ViewItemTracker)
 *   view_item_list     → estanterías home / catálogo (TrackViewItemList)
 *   select_item        → tap en ProductCard
 *   add_to_cart        → CartContext.addToCart
 *   remove_from_cart   → CartContext.removeFromCart
 *   view_cart          → apertura del CartDrawer
 *   begin_checkout     → montaje de CheckoutFlow
 *   add_shipping_info  → submit del paso de envío
 *   add_payment_info   → submit del paso de pago
 *   purchase           → /checkout/success (dedupe por transaction_id)
 */

export const GA4_CURRENCY = 'USD';

export interface Ga4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
  index?: number;
}

type Gtag = (...args: unknown[]) => void;

function getGtag(): Gtag | null {
  if (typeof window === 'undefined') return null;
  if (!process.env.NEXT_PUBLIC_GA4_ID) return null;
  const g = (window as { gtag?: Gtag }).gtag;
  return typeof g === 'function' ? g : null;
}

/** Dispara un evento GA4. Silencioso e inofensivo si GA no está configurado. */
export function track(event: string, params?: Record<string, unknown>): void {
  try {
    const gtag = getGtag();
    if (!gtag) return;
    gtag('event', event, params ?? {});
  } catch {
    /* nunca romper la UI por analítica */
  }
}

/** Mapea un producto de la UI (ProductCard/CartItem) a item de GA4. */
export function toGa4Item(p: {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  price?: number;
  quantity?: number;
}): Ga4Item {
  return {
    item_id: p.id,
    item_name: p.name,
    ...(p.category ? { item_category: p.category } : {}),
    ...(p.brand ? { item_brand: p.brand } : {}),
    ...(typeof p.price === 'number' ? { price: p.price } : {}),
    ...(typeof p.quantity === 'number' ? { quantity: p.quantity } : {}),
  };
}

/** Valor total de una lista de items (price × quantity). */
export function ga4ItemsValue(items: Ga4Item[]): number {
  return Math.round(
    items.reduce((acc, i) => acc + (i.price ?? 0) * (i.quantity ?? 1), 0) * 100,
  ) / 100;
}

/**
 * purchase con dedupe: GA cuenta doble si el cliente recarga /checkout/success.
 * sessionStorage guarda los transaction_id ya reportados en esta sesión.
 */
export function trackPurchaseOnce(params: {
  transactionId: string;
  value: number;
  items: Ga4Item[];
  coupon?: string | null;
}): void {
  try {
    const key = 'mt_ga4_purchases';
    const seen: string[] = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    if (seen.includes(params.transactionId)) return;
    seen.push(params.transactionId);
    sessionStorage.setItem(key, JSON.stringify(seen.slice(-20)));
  } catch {
    /* sessionStorage puede fallar (modo privado) — se trackea igual */
  }
  track('purchase', {
    transaction_id: params.transactionId,
    value: params.value,
    currency: GA4_CURRENCY,
    ...(params.coupon ? { coupon: params.coupon } : {}),
    items: params.items,
  });
}
