// ─────────────────────────────────────────────────────────────
// ESPECIFICACIONES TÉCNICAS DE PRODUCTO
// ─────────────────────────────────────────────────────────────
export interface ProductSpec {
  name:  string;
  value: string;
}

/** Valida y convierte el campo Json? de Prisma a ProductSpec[]. Devuelve [] si el valor no es válido. */
export function parseProductSpecs(raw: unknown): ProductSpec[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is ProductSpec =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as ProductSpec).name  === 'string' &&
      typeof (s as ProductSpec).value === 'string' &&
      (s as ProductSpec).name.trim()  !== '' &&
      (s as ProductSpec).value.trim() !== '',
  );
}

// ─────────────────────────────────────────────────────────────
// CARRITO
// ─────────────────────────────────────────────────────────────

/** Ítem de carrito tal como lo devuelve la API /api/cart (con datos de producto enriquecidos). */
export interface CartItemAPI {
  /** ID del registro CartItem en BD. */
  id: string;
  productId: string;
  quantity: number;
  name: string;
  slug: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  category: string;
  brand: string | null;
  images: string[];
}

// ─────────────────────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'Pendiente verificación Binance'
  | 'Pendiente'
  | 'En Proceso'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

/** Valores válidos para actualización manual de estado (excluye Binance que tiene ruta propia). */
export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'Pendiente',
  'En Proceso',
  'Enviado',
  'Entregado',
  'Cancelado',
];

// ─────────────────────────────────────────────────────────────
// RESEÑAS
// ─────────────────────────────────────────────────────────────
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const VALID_REVIEW_STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export interface Review {
  id:               string;
  productId:        string;
  productName?:     string;
  userId:           string | null;
  authorName:       string;
  rating:           number;
  title?:           string | null;
  comment:          string;
  status:           ReviewStatus;
  verifiedPurchase: boolean;
  adminReply?:      string | null;
  photos:           string[];
  createdAt:        string;
}

export interface ReviewSummary {
  average: number;
  count:   number;
  /** Distribución por estrella: índice 0 = 1★ … índice 4 = 5★. */
  breakdown: [number, number, number, number, number];
}

// ─────────────────────────────────────────────────────────────
// CUPONES
// ─────────────────────────────────────────────────────────────
export type CouponDiscountType = 'PERCENT' | 'FIXED';

export const VALID_COUPON_TYPES: CouponDiscountType[] = ['PERCENT', 'FIXED'];

export interface Coupon {
  id:            string;
  code:          string;
  description?:  string | null;
  discountType:  CouponDiscountType;
  discountValue: number;
  minPurchase:   number;
  maxDiscount?:  number | null;
  maxUses?:      number | null;
  usedCount:     number;
  perUserLimit?: number | null;
  startsAt?:     string | null;
  expiresAt?:    string | null;
  active:        boolean;
  createdAt:     string;
}

// ─────────────────────────────────────────────────────────────
// CARRITO ABANDONADO
// ─────────────────────────────────────────────────────────────
export type AbandonedCartStatus =
  | 'PENDING'
  | 'EMAILED_24H'
  | 'EMAILED_72H'
  | 'RECOVERED'
  | 'OPTED_OUT';

/** Estados en los que el carrito todavía puede recibir un email de recuperación. */
export const ABANDONED_CART_EMAILABLE_STATUSES: AbandonedCartStatus[] = ['PENDING', 'EMAILED_24H'];

export interface AbandonedCartItem {
  id:       string;
  name:     string;
  slug:     string;
  price:    number;
  quantity: number;
  image:    string | null;
}

// ─────────────────────────────────────────────────────────────
// RESTOCK
// ─────────────────────────────────────────────────────────────
export interface RestockSubscription {
  id:         string;
  email:      string;
  productId:  string;
  notifiedAt: string | null;
  createdAt:  string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface OrderItem {
  id?:         string;
  productId:   string;
  productName: string;
  quantity:    number;
  price:       number;
  imageUrl?:   string;
}

export interface ShippingDetails {
  address:  string;
  city:     string;
  state:    string;
  zipCode:  string;
  country:  string;
}

/** Tipo de pedido normalizado para toda la UI — compatible con el modelo Prisma Order. */
export interface Order {
  id:              string;
  orderNumber:     number;
  createdAt:       string;
  customerId:      string | null;
  customerName:    string;
  customerEmail?:  string | null;
  customerPhone?:  string | null;
  customerIdNumber?: string | null;
  items:           OrderItem[];
  total:           number;
  /** Si existe, `total` y precios de ítems están en Bs. (tasa al comprar). Si no, legado en USD. */
  exchangeRateUsdBs?: number | null;
  status:          OrderStatus;
  shippingDetails: ShippingDetails;
  paymentMethod:   string;
  paymentBank?:              string | null;
  paymentHolderIdNumber?:    string | null;
  paymentHolderPhone?:       string | null;
  paymentReference?:         string | null;
  paymentProofUrl?:          string | null;
  trackingNumber?:           string | null;
  trackingCarrier?:          string | null;
  trackingPhotoUrl?:         string | null;
  trackingUrl?:              string | null;
  shippedAt?:                string | null;
  /** ISO: validación de pago (admin). Null en pedidos antiguos o aún pendientes. */
  paidAt?:                   string | null;
  /** Código de cupón aplicado (mayúsculas). Null si no se usó cupón. */
  couponCode?:               string | null;
  /** Descuento del cupón en Bs (misma moneda que `total`). */
  couponDiscount?:           number | null;
  /** Email del admin que validó/rechazó el pago (auditoría). */
  paymentVerifiedBy?:        string | null;
  /** Motivo de rechazo del pago, si aplica. */
  paymentRejectionReason?:   string | null;
  notes?:          string | null;
}

// ─────────────────────────────────────────────────────────────
// LIBRO DE DIRECCIONES
// ─────────────────────────────────────────────────────────────

export interface SavedAddress {
  id:             string;
  userId:         string;
  alias:          string;
  firstName:      string;
  lastName:       string;
  idNumber:       string;
  phoneNumber:    string;
  shippingMethod: 'tienda' | 'mrw';
  mrwState?:      string | null;
  mrwOffice?:     string | null;
  isDefault:      boolean;
  createdAt:      string;
}

export interface SavedAddressInput {
  alias:          string;
  firstName:      string;
  lastName:       string;
  idNumber:       string;
  phoneNumber:    string;
  shippingMethod: 'tienda' | 'mrw';
  mrwState?:      string | null;
  mrwOffice?:     string | null;
  isDefault?:     boolean;
}

import { d, dn } from '@/lib/decimal';

type DecimalLike = { toNumber(): number } | number;

/** Mapea un registro Prisma (con items incluidos) al tipo Order de la UI. */
export function prismaOrderToOrder(o: {
  id: string;
  orderNumber: number;
  createdAt: Date;
  customerId: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerIdNumber?: string | null;
  total: DecimalLike;
  status: string;
  paymentMethod: string;
  paymentBank?: string | null;
  paymentHolderIdNumber?: string | null;
  paymentHolderPhone?: string | null;
  paymentReference?: string | null;
  paymentProofUrl?: string | null;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  trackingPhotoUrl?: string | null;
  trackingUrl?: string | null;
  shippedAt?: Date | null;
  paidAt?: Date | null;
  couponCode?: string | null;
  couponDiscount?: DecimalLike | null;
  paymentVerifiedBy?: string | null;
  paymentRejectionReason?: string | null;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  exchangeRateUsdBs?: DecimalLike | null;
  notes?: string | null;
  items: { id: string; productId: string; productName: string; quantity: number; price: DecimalLike; imageUrl?: string | null }[];
}): Order {
  return {
    id:              o.id,
    orderNumber:     o.orderNumber,
    createdAt:       o.createdAt.toISOString(),
    customerId:      o.customerId,
    customerName:    o.customerName,
    customerEmail:   o.customerEmail,
    customerPhone:   o.customerPhone,
    customerIdNumber: o.customerIdNumber,
    // PRD-204: convertir Decimal → number en la frontera BD→UI
    total:           d(o.total),
    exchangeRateUsdBs: dn(o.exchangeRateUsdBs),
    status:          o.status as OrderStatus,
    paymentMethod:   o.paymentMethod,
    paymentBank:              o.paymentBank,
    paymentHolderIdNumber:    o.paymentHolderIdNumber,
    paymentHolderPhone:       o.paymentHolderPhone,
    paymentReference:         o.paymentReference,
    paymentProofUrl:          o.paymentProofUrl,
    trackingNumber:           o.trackingNumber  ?? null,
    trackingCarrier:          o.trackingCarrier ?? null,
    trackingPhotoUrl:         o.trackingPhotoUrl ?? null,
    trackingUrl:              o.trackingUrl    ?? null,
    shippedAt:                o.shippedAt ? o.shippedAt.toISOString() : null,
    paidAt:                   o.paidAt ? o.paidAt.toISOString() : null,
    couponCode:               o.couponCode ?? null,
    couponDiscount:           dn(o.couponDiscount),
    paymentVerifiedBy:        o.paymentVerifiedBy ?? null,
    paymentRejectionReason:   o.paymentRejectionReason ?? null,
    notes:           o.notes,
    shippingDetails: {
      address:  o.shippingAddress,
      city:     o.shippingCity,
      state:    o.shippingState,
      zipCode:  o.shippingZipCode,
      country:  o.shippingCountry,
    },
    items: o.items.map(i => ({
      id:          i.id,
      productId:   i.productId,
      productName: i.productName,
      quantity:    i.quantity,
      price:       d(i.price),
      imageUrl:    i.imageUrl ?? undefined,
    })),
  };
}
