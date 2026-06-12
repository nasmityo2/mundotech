'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { d, dn } from '@/lib/decimal';
import {
  SEARCH_PAGE_SIZE,
  type SearchResult,
  type FullProduct,
  type FullSearchResult,
} from '@/lib/search-shared';

const EMPTY_FULL_RESULT: FullSearchResult = {
  products: [],
  totalCount: 0,
  categories: [],
  brands: [],
};

/** PRD-166: IP real del visitante para rate limit en Server Actions públicas. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return getClientIp(new Request('https://internal.local', { headers: h as unknown as HeadersInit }));
}

export async function searchProducts(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > 120) return [];

  // PRD-166: Server Action pública invocable por POST — límite por IP.
  if (await rateLimit(`search:suggest:${await clientIp()}`, { limit: 40, windowMs: 60_000 })) {
    return [];
  }

  const rows = await prisma.product.findMany({
    where: {
      OR: [
        { name:        { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category:    { contains: q, mode: 'insensitive' } },
        { brand:       { contains: q, mode: 'insensitive' } },
        // PRD-165: el autocompletado también encuentra por SKU exacto/parcial.
        { sku:         { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 7,
    orderBy: { createdAt: 'desc' },
    select: {
      id:       true,
      slug:     true,
      name:     true,
      price:    true,
      category: true,
      brand:    true,
      images:   true,
    },
  });
  // PRD-204: price es Decimal → convertir a number
  return rows.map(p => ({ ...p, price: d(p.price) }));
}

// ─────────────────────────────────────────────────────────────
// Búsqueda completa paginada (página /buscar)
// Constantes y tipos compartidos: lib/search-shared.ts
// ─────────────────────────────────────────────────────────────

export async function searchProductsFull({
  query,
  category,
  brand,
  sort = 'default',
  page = 1,
  includeOutOfStock = false,
}: {
  query:     string;
  category?: string;
  brand?:    string;
  sort?:     string;
  page?:     number;
  /** PRD-167: por defecto la búsqueda solo lista productos con stock. */
  includeOutOfStock?: boolean;
}): Promise<FullSearchResult> {
  const q = query.trim();

  // PRD-168: una consulta no vacía pero demasiado corta no debe volcar el
  // catálogo completo como "resultados".
  if (q.length === 1) return EMPTY_FULL_RESULT;

  // PRD-166: Server Action pública — límite generoso por IP (render de página).
  if (await rateLimit(`search:full:${await clientIp()}`, { limit: 60, windowMs: 60_000 })) {
    return EMPTY_FULL_RESULT;
  }

  const textFilter =
    q.length >= 2
      ? {
          OR: [
            { name:        { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
            { category:    { contains: q, mode: 'insensitive' as const } },
            { brand:       { contains: q, mode: 'insensitive' as const } },
            // PRD-165: búsqueda por SKU también en la página /buscar.
            { sku:         { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

  // PRD-167: filtro de disponibilidad (server-side, no manipulable más allá
  // de incluir agotados explícitamente con el toggle de la UI).
  const stockFilter = includeOutOfStock ? {} : { stock: { gt: 0 } };

  const where = {
    ...textFilter,
    ...stockFilter,
    ...(category ? { category: { equals: category, mode: 'insensitive' as const } } : {}),
    ...(brand    ? { brand:    { equals: brand,    mode: 'insensitive' as const } } : {}),
  };

  type OrderBy = { price?: 'asc' | 'desc'; name?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' };
  const orderBy: OrderBy =
    sort === 'price-asc'  ? { price: 'asc' }    :
    sort === 'price-desc' ? { price: 'desc' }   :
    sort === 'name-asc'   ? { name: 'asc' }     :
    sort === 'name-desc'  ? { name: 'desc' }    :
                            { createdAt: 'desc' };

  const skip = (page - 1) * SEARCH_PAGE_SIZE;

  const [rows, totalCount, filterOptions] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: SEARCH_PAGE_SIZE,
      select: {
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
      },
    }),
    prisma.product.count({ where }),
    // Opciones de filtro: categorías y marcas del conjunto sin filtro de cat/brand
    prisma.product.findMany({
      where: { ...textFilter, ...stockFilter },
      select: { category: true, brand: true },
    }),
  ]);

  const categories = [...new Set(filterOptions.map((p) => p.category))].sort();
  const brands = [
    ...new Set(filterOptions.map((p) => p.brand).filter((b): b is string => b != null)),
  ].sort();

  const products: FullProduct[] = rows.map((p) => ({
    id:            p.id,
    slug:          p.slug,
    name:          p.name,
    description:   p.description ?? '',
    // PRD-204: convertir Decimal → number
    price:         d(p.price),
    originalPrice: dn(p.originalPrice),
    stock:         p.stock,
    category:      p.category,
    brand:         p.brand,
    image:         p.images[0] ?? '/placeholder-product.png',
    images:        p.images,
    details:       {},
  }));

  return { products, totalCount, categories, brands };
}
