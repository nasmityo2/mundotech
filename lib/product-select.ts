import type { Prisma } from '@prisma/client';

/**
 * Campos mínimos para ProductCard y listados públicos de catálogo.
 * Excluye `isActive`, timestamps y campos internos — evita crash si Prisma
 * intenta leer columnas aún no migradas cuando la consulta no las necesita.
 */
export const PRODUCT_CARD_SELECT = {
  id:            true,
  slug:          true,
  name:          true,
  description:   true,
  price:         true,
  originalPrice: true,
  stock:         true,
  category:      true,
  brand:         true,
  images:        true,
} as const satisfies Prisma.ProductSelect;

/**
 * Campos para ficha de producto (SSR) — incluye specs, sku y media ordenada.
 */
export const PRODUCT_DETAIL_SELECT = {
  id:            true,
  slug:          true,
  name:          true,
  description:   true,
  price:         true,
  originalPrice: true,
  stock:         true,
  category:      true,
  brand:         true,
  images:        true,
  sku:           true,
  specs:         true,
  updatedAt:     true,
  media:         { orderBy: { sortOrder: 'asc' as const } },
} as const satisfies Prisma.ProductSelect;

/** Inventario admin — incluye campos de edición; requiere columna `isActive` migrada. */
export const PRODUCT_ADMIN_SELECT = {
  id:            true,
  sku:           true,
  slug:          true,
  name:          true,
  description:   true,
  price:         true,
  originalPrice: true,
  cost:          true,
  profitMarginPct: true,
  stock:         true,
  category:      true,
  brand:         true,
  images:        true,
  specs:         true,
  isActive:      true,
  createdAt:     true,
  media:         { orderBy: { sortOrder: 'asc' as const } },
} as const satisfies Prisma.ProductSelect;
