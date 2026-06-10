'use server';

import { prisma } from '@/lib/prisma';
import {
  SEARCH_PAGE_SIZE,
  type SearchResult,
  type FullProduct,
  type FullSearchResult,
} from '@/lib/search-shared';

export async function searchProducts(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  return prisma.product.findMany({
    where: {
      OR: [
        { name:        { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category:    { contains: q, mode: 'insensitive' } },
        { brand:       { contains: q, mode: 'insensitive' } },
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
}: {
  query:     string;
  category?: string;
  brand?:    string;
  sort?:     string;
  page?:     number;
}): Promise<FullSearchResult> {
  const q = query.trim();

  const textFilter =
    q.length >= 2
      ? {
          OR: [
            { name:        { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
            { category:    { contains: q, mode: 'insensitive' as const } },
            { brand:       { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

  const where = {
    ...textFilter,
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
      where: textFilter,
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
    price:         p.price,
    originalPrice: p.originalPrice,
    stock:         p.stock,
    category:      p.category,
    brand:         p.brand,
    image:         p.images[0] ?? '/placeholder-product.png',
    images:        p.images,
    details:       {},
  }));

  return { products, totalCount, categories, brands };
}
