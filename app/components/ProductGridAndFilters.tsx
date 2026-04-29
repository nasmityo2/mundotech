'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProducts } from '../../context/ProductContext';
import ProductCard from '../../components/ProductCard';
import CategorySidebar from '../../components/CategorySidebar';
import ProductCardSkeleton from '../../components/ProductCardSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, X, SearchX } from 'lucide-react';

const sortOptions = [
  { value: 'default',    label: 'Relevancia'   },
  { value: 'price-asc',  label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'name-asc',   label: 'Nombre A-Z'   },
  { value: 'name-desc',  label: 'Nombre Z-A'   },
];

const ProductGridAndFilters = () => {
  const {
    filteredAndSortedProducts,
    loading,
    sortOption,
    setSortOption,
    filterCategory,
    setFilterCategory,
    searchTerm,
    setSearchTerm,
  } = useProducts();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(decodeURIComponent(q));
    const c = searchParams.get('cat');
    if (c) setFilterCategory(decodeURIComponent(c));
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section id="products" className="flex flex-col lg:flex-row gap-5 sm:gap-6 lg:gap-8 w-full max-w-full">

      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:block w-[280px] flex-shrink-0">
        <div className="sticky top-[96px]">
          <CategorySidebar />
        </div>
      </aside>

      {/* ── Grid + toolbar ── */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-3 sm:p-4 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] sm:text-sm font-semibold text-navy capitalize truncate">
              {filterCategory === 'all' ? 'Todos' : filterCategory}
              {searchTerm && (
                <span className="text-slate-500 font-normal"> · “{searchTerm}”</span>
              )}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-navy nums">{filteredAndSortedProducts.length}</span>{' '}
              {filteredAndSortedProducts.length === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>

          {/* Filtros móvil */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-navy text-xs font-semibold px-3 min-h-[44px] rounded-xl transition-colors flex-shrink-0"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden xs:inline">Filtros</span>
          </button>

          {/* Sort */}
          <div className="relative flex-shrink-0">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Ordenar productos"
              className="appearance-none bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-navy text-base font-semibold pl-3 pr-8 min-h-[44px] rounded-xl cursor-pointer transition-colors focus:outline-none focus:bg-white focus:shadow-ring-navy max-w-[160px] xs:max-w-none truncate"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Active filter chips */}
        {(filterCategory !== 'all' || searchTerm) && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-slate-500">Filtros activos:</span>
            {filterCategory !== 'all' && (
              <button
                onClick={() => setFilterCategory('all')}
                className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 h-8 rounded-full hover:bg-navy-700 transition-colors"
              >
                <span className="capitalize">{filterCategory}</span>
                <X size={12} />
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 h-8 rounded-full hover:bg-navy-700 transition-colors"
              >
                <span className="truncate max-w-[160px]">“{searchTerm}”</span>
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft px-5 py-12 sm:py-20 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <SearchX size={28} />
            </div>
            <p className="mt-4 text-lg font-semibold text-navy">Sin resultados</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              Prueba con otra búsqueda, ajusta los filtros o vuelve al catálogo principal.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterCategory('all');
                setSearchTerm('');
              }}
              className="mt-5 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 min-h-[44px] rounded-xl hover:bg-navy-700 active:bg-navy-800 shadow-soft hover:shadow-card transition-all"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <motion.div
            key={filterCategory + sortOption + searchTerm}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
          >
            {filteredAndSortedProducts.map((product) => (
              <motion.div
                key={product.id}
                variants={{
                  hidden:  { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
                className="h-full"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Sidebar mobile ── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[88vw] max-w-[340px] bg-surface-sunken h-full overflow-y-auto p-5 shadow-lift"
            >
              <div className="flex items-center justify-between mb-5">
                <p className="text-base font-semibold text-navy">Filtros</p>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-navy hover:bg-slate-100 active:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>
              <CategorySidebar />
              <button
                className="mt-5 w-full bg-navy text-white font-semibold text-sm h-12 rounded-xl hover:bg-navy-700 shadow-soft hover:shadow-card transition-all"
                onClick={() => setMobileSidebarOpen(false)}
              >
                Ver {filteredAndSortedProducts.length} productos
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ProductGridAndFilters;
