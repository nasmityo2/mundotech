import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, SearchX } from 'lucide-react';
import { searchProductsFull } from '@/app/actions/search';
import { SEARCH_PAGE_SIZE } from '@/lib/search-shared';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import SearchFiltersBar from './SearchFiltersBar';
import SearchPagination from './SearchPagination';
import type { Product } from '@/context/ProductContext';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotech.com.ve';

interface PageProps {
  searchParams: Promise<{
    q?:     string;
    cat?:   string;
    brand?: string;
    sort?:  string;
    page?:  string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const title = q
    ? `"${q}" — Búsqueda · MundoTech`
    : 'Resultados de búsqueda · MundoTech';
  const description = q
    ? `Resultados para "${q}" en MundoTech: tecnología, gadgets y accesorios en Barquisimeto.`
    : 'Busca productos de tecnología y gadgets en MundoTech Barquisimeto.';
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/buscar${q ? `?q=${encodeURIComponent(q)}` : ''}` },
    robots: { index: false },
  };
}

export default async function BuscarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q     = (params.q     ?? '').trim();
  const cat   = (params.cat   ?? '').trim();
  const brand = (params.brand ?? '').trim();
  const sort  = (params.sort  ?? 'default').trim();
  const page  = Math.max(1, parseInt(params.page ?? '1', 10));

  const { products, totalCount, categories, brands } = await searchProductsFull({
    query:    q,
    category: cat   || undefined,
    brand:    brand || undefined,
    sort,
    page,
  });

  const totalPages   = Math.ceil(totalCount / SEARCH_PAGE_SIZE);
  const hasFilters   = !!cat || !!brand;
  const showEmpty    = !q && !hasFilters;
  const activeCount  = (cat ? 1 : 0) + (brand ? 1 : 0);

  return (
    <div className="pb-10 sm:pb-12 w-full max-w-full">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-6 lg:p-8 mb-5 sm:mb-8">
        <nav
          className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mb-3 truncate"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-navy transition-colors">
            Inicio
          </Link>
          <ChevronRight size={12} className="flex-shrink-0" />
          <span className="text-navy font-medium">Búsqueda</span>
          {q && (
            <>
              <ChevronRight size={12} className="flex-shrink-0" />
              <span className="text-navy/60 truncate max-w-[200px]">{q}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600 mb-2">
              <Search size={11} />
              Resultados de búsqueda
            </p>
            {q ? (
              <h1 className="text-[1.4rem] sm:text-2xl md:text-[2rem] font-bold text-navy tracking-tight leading-[1.1]">
                Resultados para{' '}
                <span className="text-brand-yellow">"{q}"</span>
              </h1>
            ) : (
              <h1 className="text-[1.4rem] sm:text-2xl md:text-[2rem] font-bold text-navy tracking-tight leading-[1.1]">
                Explorar catálogo
              </h1>
            )}
            {!showEmpty && (
              <p className="text-[13px] sm:text-sm text-slate-500 mt-1.5">
                <span className="font-semibold text-navy nums">{totalCount}</span>{' '}
                {totalCount === 1 ? 'producto encontrado' : 'productos encontrados'}
                {cat && (
                  <> en <span className="font-medium capitalize text-navy/80">{cat}</span></>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sin consulta: estado vacío ── */}
      {showEmpty ? (
        <EmptySearchState />
      ) : (
        <section className="flex flex-col lg:flex-row gap-5 sm:gap-6 lg:gap-8 w-full max-w-full">

          {/* ── Sidebar filtros (desktop) ── */}
          <div className="hidden lg:block w-[260px] flex-shrink-0">
            <div className="sticky top-[96px]">
              <SearchFiltersBar
                q={q}
                currentCat={cat}
                currentBrand={brand}
                currentSort={sort}
                categories={categories}
                brands={brands}
                totalCount={totalCount}
                variant="sidebar"
              />
            </div>
          </div>

          {/* ── Contenido principal ── */}
          <div className="flex-1 min-w-0">

            {/* Toolbar móvil */}
            <SearchFiltersBar
              q={q}
              currentCat={cat}
              currentBrand={brand}
              currentSort={sort}
              categories={categories}
              brands={brands}
              totalCount={totalCount}
              variant="toolbar"
              filteredCount={products.length}
              activePage={page}
            />

            {/* Chips de filtros activos */}
            {activeCount > 0 && (
              <ActiveFilterChips q={q} cat={cat} brand={brand} sort={sort} />
            )}

            {/* Grid */}
            {products.length === 0 ? (
              <NoResultsState q={q} cat={cat} brand={brand} />
            ) : (
              <Suspense
                fallback={
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))}
                  </div>
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product as Product} />
                  ))}
                </div>
              </Suspense>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-8">
                <SearchPagination
                  q={q}
                  cat={cat}
                  brand={brand}
                  sort={sort}
                  currentPage={page}
                  totalPages={totalPages}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-componentes de servidor (sin estado, sin "use client")
// ─────────────────────────────────────────────────────────────

function EmptySearchState() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft px-5 py-16 sm:py-24 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <Search size={28} />
      </div>
      <h2 className="text-lg font-semibold text-navy">¿Qué estás buscando?</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
        Ingresa el nombre de un producto, marca o categoría en la barra de búsqueda.
      </p>
      <Link
        href="/productos"
        className="mt-6 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 min-h-[44px] rounded-xl hover:bg-navy-700 active:bg-navy-800 shadow-soft hover:shadow-card transition-all"
      >
        Ver catálogo completo
      </Link>
    </div>
  );
}

function NoResultsState({ q, cat, brand }: { q: string; cat: string; brand: string }) {
  const clearHref = `/buscar${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft px-5 py-12 sm:py-20 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <SearchX size={28} />
      </div>
      <p className="mt-4 text-lg font-semibold text-navy">Sin resultados</p>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
        No encontramos productos que coincidan con{' '}
        {q && <><span className="font-medium">"{q}"</span>{(cat || brand) ? ' y' : ''} </>}
        {cat && <span className="font-medium capitalize">{cat}</span>}
        {brand && cat && ' / '}
        {brand && <span className="font-medium">{brand}</span>}.
        Prueba con otros términos o limpia los filtros.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {(cat || brand) && (
          <Link
            href={clearHref}
            className="inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 min-h-[44px] rounded-xl hover:bg-navy-700 active:bg-navy-800 shadow-soft transition-all"
          >
            Quitar filtros
          </Link>
        )}
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 bg-slate-100 text-navy text-sm font-semibold px-5 min-h-[44px] rounded-xl hover:bg-slate-200 transition-all"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}

function ActiveFilterChips({
  q,
  cat,
  brand,
  sort,
}: {
  q: string;
  cat: string;
  brand: string;
  sort: string;
}) {
  const base = (without: 'cat' | 'brand') => {
    const params = new URLSearchParams();
    if (q)                    params.set('q',     q);
    if (without !== 'cat'   && cat)   params.set('cat',   cat);
    if (without !== 'brand' && brand) params.set('brand', brand);
    if (sort && sort !== 'default')   params.set('sort',  sort);
    const qs = params.toString();
    return `/buscar${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      <span className="text-xs text-slate-500">Filtros activos:</span>
      {cat && (
        <Link
          href={base('cat')}
          className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 h-8 rounded-full hover:bg-navy-700 transition-colors"
        >
          <span className="capitalize">{cat}</span>
          <span aria-hidden>×</span>
        </Link>
      )}
      {brand && (
        <Link
          href={base('brand')}
          className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 h-8 rounded-full hover:bg-navy-700 transition-colors"
        >
          {brand}
          <span aria-hidden>×</span>
        </Link>
      )}
    </div>
  );
}
