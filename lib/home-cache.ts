/**
 * Cached reads for the home page (ISR, revalidate=300).
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

export const getCachedHomeProducts = unstable_cache(
  async () => {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: PRODUCT_CARD_SELECT,
    });
    return rows.map((p) => ({
      ...p,
      price: d(p.price),
      originalPrice: dn(p.originalPrice),
    }));
  },
  ['home-products'],
  { tags: ['catalog'], revalidate: REVALIDATE },
);

export const getCachedHeroBanners = unstable_cache(
  () =>
    prisma.banner.findMany({
      where: { type: 'hero', active: true },
      orderBy: [{ order: 'asc' }],
      take: 10,
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
