import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotechve.com';

export const dynamic = 'force-dynamic';

/**
 * Sitemap dinámico — solo rutas públicas indexables.
 *
 * Priorities: home 1.0 · catálogo/productos 0.8 · categorías 0.7 · estáticas 0.5.
 * Excluidas SIEMPRE: /admin, /api, /checkout, /account, /cart, /wishlist,
 * /buscar (noindex) y rutas de auth (noindex).
 *
 * H18: las páginas estáticas no emiten `lastModified` — antes enviaban
 * `new Date()` en cada request y Google las re-rastreaba sin necesidad.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Páginas estáticas ──────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/productos`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/tienda-barquisimeto`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/nosotros`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/devoluciones`,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms-of-service`,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/shipping-policy`,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];

  // ── Productos dinámicos ────────────────────────────────────────────────────
  // Usa el id como fallback cuando slug es null (mismo patrón que los enlaces
  // del sitio y el canonical de la ficha).
  // DEPENDENCIA-03 (PRD-064/121): cuando Product tenga flag `isActive`/
  // `published`, filtrar aquí `where: { isActive: true }`.
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.slug ?? p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // ── Categorías dinámicas ───────────────────────────────────────────────────
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { order: 'asc' },
  });

  // Rutas canónicas /categoria/[slug] (preferidas para SEO)
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/categoria/${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
