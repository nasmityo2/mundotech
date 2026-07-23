/**
 * Regla única y compartida de "envío gratis por producto".
 *
 * Sin dependencias de servidor: no importa Prisma, React, `next/*` ni módulos
 * `server-only`. Se usa tanto desde componentes cliente (checkout Full y
 * WhatsApp) como desde `lib/checkout-order.ts` (cálculo autoritativo).
 *
 * Reutiliza el `ShippingMethod` ya definido en `lib/definitions.ts` para no
 * duplicar el tipo — este archivo no importa ese módulo (evita ciclos), pero
 * el tipo local es estructuralmente idéntico.
 */
export type ShippingMethod = 'tienda' | 'mrw' | 'zoom' | 'tealca' | null | undefined;

export type ShippingChargeType = 'STORE_PICKUP' | 'FREE' | 'DESTINATION_CHARGE';

/**
 * Resuelve el tipo de cobro de envío para un carrito/pedido.
 *
 * - `tienda`: siempre retiro en tienda (nunca "gratis" en el sentido de envío
 *   por transportista — es retiro, no despacho).
 * - MRW/ZOOM/TEALCA: gratis únicamente si TODOS los productos califican
 *   (`productFreeShippingFlags` no vacío y cada flag es `true`).
 * - Cualquier otro caso (incluye método `null`/`undefined`, carrito vacío o
 *   con al menos un producto sin el beneficio): cobro a destino.
 */
export function resolveShippingChargeType(
  shippingMethod: ShippingMethod,
  productFreeShippingFlags: readonly boolean[],
): ShippingChargeType {
  if (shippingMethod === 'tienda') {
    return 'STORE_PICKUP';
  }

  const isCarrierShipping =
    shippingMethod === 'mrw' || shippingMethod === 'zoom' || shippingMethod === 'tealca';

  if (
    isCarrierShipping &&
    productFreeShippingFlags.length > 0 &&
    productFreeShippingFlags.every((flag) => flag === true)
  ) {
    return 'FREE';
  }

  return 'DESTINATION_CHARGE';
}

/** Texto visible (español) para cada tipo de cobro de envío. */
export function shippingChargeLabel(type: ShippingChargeType): string {
  if (type === 'STORE_PICKUP') {
    return 'Retiro gratis en tienda';
  }
  if (type === 'FREE') {
    return 'Envío gratis';
  }
  return 'Cobro a destino';
}

/**
 * Detecta si la dirección de un pedido ya creado corresponde a retiro en
 * tienda. `Order` no persiste `shippingMethod` como columna propia — el
 * checkout resuelve la dirección de retiro desde la configuración de la
 * tienda y la guarda como texto (`shippingAddress`) con este prefijo fijo
 * (ver `app/api/orders/route.ts`). Se usa SOLO para mostrar la UI correcta
 * en pedidos ya creados; nunca para recalcular el beneficio.
 */
export function isStorePickupOrderAddress(shippingAddress: string | null | undefined): boolean {
  return !!shippingAddress?.trim().toLowerCase().startsWith('retiro en tienda');
}

/**
 * Etiqueta visible para un pedido ya creado, usando solo snapshots
 * (`Order.freeShipping` + texto de dirección). Nunca consulta el producto actual.
 */
export function orderShippingChargeLabelFromSnapshot(order: {
  freeShipping?: boolean | null;
  shippingAddress?: string | null;
}): string {
  if (isStorePickupOrderAddress(order.shippingAddress)) {
    return shippingChargeLabel('STORE_PICKUP');
  }
  return shippingChargeLabel(order.freeShipping === true ? 'FREE' : 'DESTINATION_CHARGE');
}
