/**
 * Cached reads for the home page (ISR, revalidate=300).
 *
 * SESIÓN 14 — Cada shelf tiene su propia consulta acotada con take+select
 * mínimo. Ninguna regeneración ISR carga el catálogo completo de productos.
 *
 * Heavy Prisma queries are wrapped in unstable_cache so ISR regeneration
 * hits the Next.js Data Cache instead of Postgres on every revalidation.
 * Tags align with lib/catalog-cache.ts where applicable.
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { d, dn } from '@/lib/decimal';
import { PRODUCT_CARD_SELECT } from '@/lib/product-select';
import { readSiteContent } from '@/lib/site-content';
import { readSettings } from '@/lib/data-store';
import { resolveCategoryPathFromProductCategory } from '@/lib/resolve-category-path';

/** Matches export const revalidate in app/page.tsx (PRD-140). */
const REVALIDATE = 300;

const HOMEPAGE_CONFIG_KEYS = [
  'homepage_flashdeals',
  'homepage_shelves',
  'homepage_benefits',
] as const;

/**
 * Tipo compartido para productos de las estanterías del home.
 * price ya convertido a number, originalPrice a number | null.
 */
export type HomeShelfProduct = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  category: string;
  brand: string | null;
  images: string[];
};

/** Convierte filas Prisma con Decimal al tipo HomeShelfProduct. */
function toHomeShelfProduct(p: {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  price: { toNumber(): number };
  originalPrice: { toNumber(): number } | null;
  stock: number;
  category: string;
  brand: string | null;
  images: string[];
}): HomeShelfProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: d(p.price),
    originalPrice: dn(p.originalPrice),
    stock: p.stock,
    category: p.category,
    brand: p.brand,
    images: p.images,
  };
}

// ── Product shelves (cada una con take acotado) ────────────────────────────

/**
 * Novedades: últimos 8 productos activos.
 * SESIÓN 14 — take 8, nunca catálogo completo.
 */
export const getCachedNewestProducts = unstable_cache(
  async (): Promise<HomeShelfProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: PRODUCT_CARD_SELECT,
    });
    return rows.map(toHomeShelfProduct);
  },
  ['home-newest-products'],
  { tags: ['catalog'], revalidate: REVALIDATE },
);

/**
 * Ofertas: productos con originalPrice no null, máximo 24 en BD.
 * Luego filtra en memoria los que realmente tienen rebaja (originalPrice > price)
 * y retorna máximo 10. DB-safe: nunca catálogo completo.
 * SESIÓN 14 — take 24, filtra en memoria, máximo 10.
 */
export const getCachedFlashDeals = unstable_cache(
  async (): Promise<HomeShelfProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { isActive: true, originalPrice: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: PRODUCT_CARD_SELECT,
    });
    return rows
      .map(toHomeShelfProduct)
      .filter((p) => p.originalPrice != null && p.originalPrice > p.price)
      .slice(0, 10);
  },
  ['home-flash-deals'],
  { tags: ['catalog'], revalidate: REVALIDATE },
);

/** Regex para detectar productos de gaming en el catálogo. */
const GAMING_RE =
  /consola|gaming|retro|game|handheld|r36|portátil|portatil|nintendo|playstation|xbox|steam/;

function productHaystack(p: HomeShelfProduct): string {
  return `${p.category} ${p.name} ${p.brand ?? ''}`.toLowerCase();
}

/**
 * Gaming: últimos 24 productos activos, filtrados por regex en memoria.
 * Máximo 8 resultados. DB-safe: nunca catálogo completo.
 * SESIÓN 14 — take 24, filtra en memoria, máximo 8.
 */
export const getCachedGamingProducts = unstable_cache(
  async (): Promise<HomeShelfProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: PRODUCT_CARD_SELECT,
    });
    return rows
      .map(toHomeShelfProduct)
      .filter((p) => GAMING_RE.test(productHaystack(p)))
      .slice(0, 8);
  },
  ['home-gaming-products'],
  { tags: ['catalog'], revalidate: REVALIDATE },
);

export const getCachedHeroBanners = unstable_cache(
  () =>
    prisma.banner.findMany({
      where: { type: 'hero', active: true },
      orderBy: [{ order: 'asc' }],
      take: 10,
      select: {
        id: true,
        imageUrl: true,
        title: true,
        subtitle: true,
        label: true,
        ctaText: true,
        tagText: true,
        link: true,
        focalPoint: true,
      },
    }),
  ['home-hero-banners'],
  { tags: ['banners'], revalidate: REVALIDATE },
);

export const getCachedHomePromoBanners = unstable_cache(
  () =>
    prisma.banner.findMany({
      where: { type: 'ad_box', active: true },
      orderBy: { order: 'asc' },
      take: 2,
      select: { id: true, imageUrl: true, title: true, link: true },
    }),
  ['home-promo-banners'],
  { tags: ['banners'], revalidate: REVALIDATE },
);

export const getCachedHomeDiscoverBanners = unstable_cache(
  () =>
    prisma.banner.findMany({
      where: { type: 'discover', active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      take: 6,
    }),
  ['home-discover-banners'],
  { tags: ['banners'], revalidate: REVALIDATE },
);

export const getCachedHomeFeaturedCategories = unstable_cache(
  () =>
    prisma.category.findMany({
      where:   { isFeatured: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select:  { name: true, slug: true, imageUrl: true },
      take:    12,
    }),
  ['home-featured-categories'],
  { tags: ['categories'], revalidate: REVALIDATE },
);

export const getCachedCtaBanner = unstable_cache(
  () =>
    prisma.banner.findFirst({
      where: { type: 'cta_banner', active: true },
      orderBy: [{ order: 'asc' }],
    }),
  ['home-cta-banner'],
  { tags: ['banners'], revalidate: REVALIDATE },
);

export const getCachedHomePromotions = unstable_cache(
  () =>
    prisma.promotion.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }],
      take: 3,
    }),
  ['home-promotions'],
  { tags: ['promotions'], revalidate: REVALIDATE },
);

export const getCachedHomepageConfig = unstable_cache(
  async () => {
    const configRows = await prisma.appConfig.findMany({
      where: { key: { in: [...HOMEPAGE_CONFIG_KEYS] } },
    });
    const configMap = Object.fromEntries(
      configRows.map((r) => {
        try {
          return [r.key, JSON.parse(r.value)];
        } catch {
          return [r.key, null];
        }
      }),
    );
    return {
      flashConfig: configMap['homepage_flashdeals'] as { title: string; endHour: number } | null,
      shelvesConfig: configMap['homepage_shelves'] as {
        bestsellers: { title: string; badge: string; subtitle: string };
        newest: { title: string; badge: string; subtitle: string };
        recommended: { title: string; badge: string; subtitle: string };
      } | null,
      benefitsConfig: configMap['homepage_benefits'] as { title: string; sub: string }[] | null,
    };
  },
  ['homepage-config'],
  { tags: ['homepage-config'], revalidate: REVALIDATE },
);

export const getCachedHomeSiteContent = unstable_cache(
  readSiteContent,
  ['home-site-content'],
  { tags: ['site-content'], revalidate: REVALIDATE },
);

export const getCachedHomeSettings = unstable_cache(
  readSettings,
  ['home-settings'],
  { tags: ['store-settings'], revalidate: REVALIDATE },
);

export const getCachedGamingPath = unstable_cache(
  () => resolveCategoryPathFromProductCategory('Consolas'),
  ['home-gaming-path'],
  { tags: ['categories'], revalidate: REVALIDATE },
);
