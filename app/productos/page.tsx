import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  PAGE_SIZE,
  getCachedCatalogCount,
  getCachedCatalogProducts,
  getCachedServerCategories,
} from '@/lib/catalog-cache';
import ProductGridAndFilters from '@/app/components/ProductGridAndFilters';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import PaginationBar from '@/app/components/PaginationBar';
import JsonLd from '@/app/components/JsonLd';
import RecentlyViewed from '@/components/RecentlyViewed';
import { ChevronRight } from 'lucide-react';
import type { Product } from '@/context/ProductContext';

// PRD-140 — ISR: 5 min máximo de obsolescencia para precio/stock del catálogo
// (complementado con revalidación on-demand al cambiar tasa — PRD-142).
// Las queries Prisma están envueltas en unstable_cache (lib/catalog-cache.ts),
// por lo que el TTFB en caché caliente baja ~10–50 ms vs. el hit directo a BD.
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotechve.com';

// PAGE_SIZE re-exported so app/categoria/[slug]/page.tsx keeps working without
// a breaking import change if it still references this module.
export { PAGE_SIZE };

// ── Tipos ─────────────────────────────────────────────────────────────────────
// Tipo serializable para pasar al Client Component (sin fechas ni BigInt)
type CatalogProduct = Omit<Product, 'isNew' | 'isOffer'>;

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Sanea el parámetro raw `?page=`:
 * - Ausente, no numérico, 0 o negativo → 1.
 * - > totalPages → totalPages (el caller redirige al rango válido).
 * Nunca lanza excepciones.
 */
function sanitizePage(raw: string | undefined, totalPages: number): number {
  const n = parseInt(raw ?? '1', 10);
  if (!isFinite(n) || n < 1) return 1;
  return Math.min(n, totalPages);
}

// ── Metadata dinámica ─────────────────────────────────────────────────────────
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: rawPage } = await searchParams;
  const total      = await getCachedCatalogCount();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page       = sanitizePage(rawPage, totalPages);

  const canonicalUrl =
    page <= 1
      ? `${SITE_URL}/productos`
      : `${SITE_URL}/productos?page=${page}`;

  const titleBase = 'Catálogo de tecnología y gadgets';
  const title     = page >= 2 ? `${titleBase} — Página ${page}` : titleBase;

  return {
    title,
    description:
      'Catálogo de MundoTech Barquisimeto: gadgets, consolas, audio, computación y accesorios. Pagas en USD o Bs y recibes en toda Venezuela.',
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | MundoTech`,
      description:
        'Gadgets, consolas, audio y accesorios en Barquisimeto. USD/Bs., retiro en tienda y envíos nacionales.',
      url: canonicalUrl,
      siteName: 'MundoTech',
      locale: 'es_VE',
      type: 'website',
    },
  };
}

// ── JSON-LD (breadcrumb) ───────────────────────────────────────────────────────
const catalogBreadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio',   item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${SITE_URL}/productos` },
  ],
};

// ── Página ─────────────────────────────────────────────────────────────────────
export default async function ProductosPage({ searchParams }: PageProps) {
  const { page: rawPage } = await searchParams;

  // Cached count — no DB hit on repeated requests with the same page.
  const total      = await getCachedCatalogCount();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const page = sanitizePage(rawPage, totalPages);

  // ?page=N fuera de rango → redirige a la última página válida (no soft-404).
  if (rawPage !== undefined) {
    const raw = parseInt(rawPage, 10);
    if (!isFinite(raw) || raw < 1) {
      redirect('/productos');
    }
    if (raw > totalPages) {
      redirect(`/productos?page=${totalPages}`);
    }
  }

  const [products, serverCategories] = await Promise.all([
    getCachedCatalogProducts(page),
    getCachedServerCategories(),
  ]);

  return (
    <div className="pb-10 sm:pb-12 w-full max-w-full">
      <JsonLd data={catalogBreadcrumbSchema} />

      {/* Hero + breadcrumb */}
      <div className="card-elevated p-4 sm:p-6 lg:p-8 mb-5 sm:mb-8">
        <nav
          className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mb-3 truncate"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-navy transition-colors">
            Inicio
          </Link>
          <ChevronRight size={12} className="flex-shrink-0" />
          <span className="text-navy font-medium">Catálogo</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="chip-brand mb-2">
              Catálogo completo · Barquisimeto
            </p>
            <h1 className="text-[1.6rem] sm:text-3xl md:text-[2.25rem] font-bold text-navy tracking-tight leading-[1.05]">
              Todos los productos
              {page >= 2 && (
                <span className="ml-2 text-lg sm:text-xl font-medium text-slate-400">
                  — Página {page}
                </span>
              )}
            </h1>
            <p className="text-[13px] sm:text-sm text-slate-500 mt-2 max-w-xl">
              Filtra por categoría, ordena por precio y encuentra exactamente lo que buscas.
              Compra desde Barquisimeto con retiro en tienda o envío nacional.
            </p>
          </div>
        </div>
      </div>

      {/*
        ProductGridAndFilters recibe los productos de la página actual (ya paginados en el servidor).
        El HTML inicial contiene todos los <a href="/product/..."> con nombre y precio
        → Google los indexa sin ejecutar JS.
        La paginación (PaginationBar) también es HTML puro — crawlable sin JS.
      */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <ProductGridAndFilters
          initialProducts={products as Product[]}
          totalProductCount={total}
          serverCategories={serverCategories}
        />
      </Suspense>

      {/* Controles de paginación — enlaces <a> crawlables, sin JS */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        basePath="/productos"
      />

      <RecentlyViewed limit={6} />
    </div>
  );
}
