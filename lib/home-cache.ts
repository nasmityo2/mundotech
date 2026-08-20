/**
 * Cached reads for the home page (ISR, revalidate=300).
 *
 * Cada shelf tiene su propia consulta acotada con take+select mínimo.
 * Ninguna regeneración ISR carga el catálogo completo de productos.
 *
 * Tags: catalog, homepage-config, banners, categories, promotions, etc.
 */

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { d, dn } from '@/lib/decimal';
import { PRODUCT_CARD_SELECT } from '@/lib/product-select';
import { readSiteContent } from '@/lib/site-content';
import { readSettings } from '@/lib/data-store';
import {
  MAX_CATEGORY_SHELVES,
  normalizeHomepageFreeShipping,
  normalizeHomepageShelves,
  type HomeCategoryShelf,
  type HomepageFreeShippingConfig,
  type HomepageShelvesConfig,
} from '@/lib/homepage-config';
import {
  filterOfferShelfProducts,
  orderFeaturedProducts,
  type HomeShelfProduct,
} from '@/lib/home-shelf-products';

export type { HomeShelfProduct } from '@/lib/home-shelf-products';
export { filterOfferShelfProducts, orderFeaturedProducts } from '@/lib/home-shelf-products';

/** Matches export const revalidate in app/page.tsx (PRD-140). */
const REVALIDATE = 300;

const HOMEPAGE_CONFIG_KEYS = [
  'homepage_flashdeals',
  'homepage_shelves',
  'homepage_benefits',
  'homepage_free_shipping',
] as const;

const ACTIVE_IN_STOCK = {
  isActive: true,
  stock: { gt: 0 },
} as const;

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
  freeShipping: boolean;
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
    freeShipping: p.freeShipping === true,
  };
}

// ── Product shelves (cada una con take acotado) ────────────────────────────

/**
 * Novedades: últimos 8 productos activos con stock > 0.
 */
export const getCachedNewestProducts = unstable_cache(
  async (): Promise<HomeShelfProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { ...ACTIVE_IN_STOCK },
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
 * Ofertas: originalPrice no null, take 24, filtra rebaja real, máx. 8.
 */
export const getCachedFlashDeals = unstable_cache(
  async (): Promise<HomeShelfProduct[]> => {
    const rows = await prisma.product.findMany({
      where: {
        ...ACTIVE_IN_STOCK,
        originalPrice: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: PRODUCT_CARD_SELECT,
    });
    return filterOfferShelfProducts(rows.map(toHomeShelfProduct), 8);
  },
  ['home-flash-deals'],
  { tags: ['catalog'], revalidate: REVALIDATE },
);

/**
 * Destacados: consulta solo los IDs dados (máx. 8), activos con stock,
 * reordenados en memoria según featuredProductIds. Sin sustitutos.
 */
export async function getFeaturedProductsByIds(
  featuredProductIds: string[],
): Promise<HomeShelfProduct[]> {
  const ids = featuredProductIds
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (ids.length === 0) return [];

  return getCachedFeaturedProducts(ids);
}

const getCachedFeaturedProducts = unstable_cache(
  async (ids: string[]): Promise<HomeShelfProduct[]> => {
    if (ids.length === 0) return [];

    const rows = await prisma.product.findMany({
      where: {
        id: { in: ids },
        ...ACTIVE_IN_STOCK,
      },
      select: PRODUCT_CARD_SELECT,
    });

    const products = rows.map(toHomeShelfProduct);
    return orderFeaturedProducts(products, ids);
  },
  ['home-featured-products'],
  { tags: ['catalog', 'homepage-config'], revalidate: REVALIDATE },
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

export type HomeCategoryShelfResolved = HomeCategoryShelf & {
  slug: string;
  name: string;
  products: HomeShelfProduct[];
};

/**
 * Estanterías por categoría: hasta 18 productos activos con stock por cada
 * categoría seleccionada en el Gestor Home. Omite categorías ausentes.
 */
export async function getCategoryShelvesForHome(
  categoryShelves: HomeCategoryShelf[],
): Promise<HomeCategoryShelfResolved[]> {
  const enabled = categoryShelves
    .filter((shelf) => shelf.enabled)
    .slice(0, MAX_CATEGORY_SHELVES);

  if (enabled.length === 0) return [];

  return getCachedCategoryShelfProducts(enabled);
}

const getCachedCategoryShelfProducts = unstable_cache(
  async (
    shelves: HomeCategoryShelf[],
  ): Promise<HomeCategoryShelfResolved[]> => {
    const ids = shelves.map((s) => s.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true },
    });
    const byId = new Map(categories.map((c) => [c.id, c]));

    const resolved = await Promise.all(
      shelves.map(async (shelf) => {
        const category = byId.get(shelf.categoryId);
        if (!category) return null;

        const rows = await prisma.product.findMany({
          where: {
            ...ACTIVE_IN_STOCK,
            category: { equals: category.name, mode: 'insensitive' },
          },
          orderBy: { createdAt: 'desc' },
          take: 18,
          select: PRODUCT_CARD_SELECT,
        });

        return {
          ...shelf,
          name: category.name,
          slug: category.slug,
          products: rows.map(toHomeShelfProduct),
        };
      }),
    );

    return resolved.filter((row): row is HomeCategoryShelfResolved =>
      Boolean(row),
    );
  },
  ['home-category-shelf-products'],
  { tags: ['catalog', 'homepage-config', 'categories'], revalidate: REVALIDATE },
);

export const getCachedHomeFeaturedCategories = unstable_cache(
  () =>
    prisma.category.findMany({
      where: { isFeatured: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { name: true, slug: true, imageUrl: true },
      take: 12,
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

export type HomepageConfigCached = {
  flashConfig: { title: string; endHour: number } | null;
  shelvesConfig: HomepageShelvesConfig;
  benefitsConfig: { title: string; sub: string }[] | null;
  freeShippingConfig: HomepageFreeShippingConfig;
};

export const getCachedHomepageConfig = unstable_cache(
  async (): Promise<HomepageConfigCached> => {
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
      flashConfig: configMap['homepage_flashdeals'] as {
        title: string;
        endHour: number;
      } | null,
      shelvesConfig: normalizeHomepageShelves(configMap['homepage_shelves']),
      benefitsConfig: configMap['homepage_benefits'] as
        | { title: string; sub: string }[]
        | null,
      freeShippingConfig: normalizeHomepageFreeShipping(
        configMap['homepage_free_shipping'],
      ),
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
