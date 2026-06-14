'use server';

import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';
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

/** Expresión normalizada — debe coincidir con product_search_trgm_idx. */
const NORMALIZED_SEARCH_EXPR = Prisma.sql`immutable_unaccent(lower(coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(category,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(description,'')))`;

function textMatchWhere(q: string): Prisma.Sql {
  return Prisma.sql`(
    ${NORMALIZED_SEARCH_EXPR} LIKE '%' || immutable_unaccent(lower(${q})) || '%'
    OR immutable_unaccent(lower(name)) % immutable_unaccent(lower(${q}))
  )`;
}

function relevanceOrderBy(q: string): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN immutable_unaccent(lower(name)) LIKE immutable_unaccent(lower(${q})) || '%' THEN 0
      WHEN immutable_unaccent(lower(name)) LIKE '%' || immutable_unaccent(lower(${q})) || '%' THEN 1
      WHEN immutable_unaccent(lower(coalesce(brand,''))) LIKE '%' || immutable_unaccent(lower(${q})) || '%' THEN 2
      WHEN immutable_unaccent(lower(category)) LIKE '%' || immutable_unaccent(lower(${q})) || '%' THEN 3
      ELSE 4
    END ASC,
    similarity(immutable_unaccent(lower(name)), immutable_unaccent(lower(${q}))) DESC,
    "createdAt" DESC
  `;
}

function buildWhereConditions(options: {
  q: string;
  includeTextMatch: boolean;
  includeOutOfStock: boolean;
  category?: string;
  brand?: string;
}): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`"isActive" = true`];

  if (options.includeTextMatch) {
    conditions.push(textMatchWhere(options.q));
  }
  if (!options.includeOutOfStock) {
    conditions.push(Prisma.sql`stock > 0`);
  }
  if (options.category) {
    conditions.push(
      Prisma.sql`immutable_unaccent(lower(category)) = immutable_unaccent(lower(${options.category}))`,
    );
  }
  if (options.brand) {
    conditions.push(
      Prisma.sql`immutable_unaccent(lower(brand)) = immutable_unaccent(lower(${options.brand}))`,
    );
  }

  return Prisma.join(conditions, ' AND ');
}

function buildOrderBy(sort: string, q: string, qLen: number): Prisma.Sql {
  switch (sort) {
    case 'price-asc':
      return Prisma.sql`price ASC`;
    case 'price-desc':
      return Prisma.sql`price DESC`;
    case 'name-asc':
      return Prisma.sql`name ASC`;
    case 'name-desc':
      return Prisma.sql`name DESC`;
    default:
      return qLen >= 2 ? relevanceOrderBy(q) : Prisma.sql`"createdAt" DESC`;
  }
}

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

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      name: string;
      price: string | number;
      category: string;
      brand: string | null;
      images: string[];
    }>
  >(Prisma.sql`
    SELECT id, slug, name, price, category, brand, images
    FROM "Product"
    WHERE ${textMatchWhere(q)}
      AND "isActive" = true
    ORDER BY ${relevanceOrderBy(q)}
    LIMIT 7
  `);

  return rows.map((p) => ({ ...p, price: d(p.price) }));
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
  query: string;
  category?: string;
  brand?: string;
  sort?: string;
  page?: number;
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

  const includeTextMatch = q.length >= 2;
  const skip = (page - 1) * SEARCH_PAGE_SIZE;

  const productWhere = buildWhereConditions({
    q,
    includeTextMatch,
    includeOutOfStock,
    category,
    brand,
  });

  const facetWhere = buildWhereConditions({
    q,
    includeTextMatch,
    includeOutOfStock,
  });

  const orderBy = buildOrderBy(sort, q, q.length);

  const [productRows, facetRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        price: string | number;
        originalPrice: string | number | null;
        stock: number;
        category: string;
        brand: string | null;
        images: string[];
        totalCount: bigint;
      }>
    >(Prisma.sql`
      SELECT
        id,
        slug,
        name,
        description,
        price,
        "originalPrice",
        stock,
        category,
        brand,
        images,
        COUNT(*) OVER() AS "totalCount"
      FROM "Product"
      WHERE ${productWhere}
      ORDER BY ${orderBy}
      OFFSET ${skip}
      LIMIT ${SEARCH_PAGE_SIZE}
    `),
    prisma.$queryRaw<Array<{ category: string; brand: string | null }>>(Prisma.sql`
      SELECT category, brand
      FROM "Product"
      WHERE ${facetWhere}
    `),
  ]);

  const totalCount = productRows.length > 0 ? Number(productRows[0].totalCount) : 0;

  const categories = [...new Set(facetRows.map((p) => p.category))].sort();
  const brands = [
    ...new Set(facetRows.map((p) => p.brand).filter((b): b is string => b != null)),
  ].sort();

  const products: FullProduct[] = productRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description ?? '',
    price: d(p.price),
    originalPrice: dn(p.originalPrice),
    stock: p.stock,
    category: p.category,
    brand: p.brand,
    image: p.images[0] ?? '/placeholder-product.png',
    images: p.images,
    details: {},
  }));

  return { products, totalCount, categories, brands };
}
