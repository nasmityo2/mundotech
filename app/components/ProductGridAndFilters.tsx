'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '../../context/ProductContext';
import ProductCard from '../../components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, ChevronDown, X, SearchX,
  Tag, ArrowUpDown,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ServerCategory {
  name:  string;
  slug:  string;
  count: number;
}

interface Props {
  /** Productos de la página actual (ya paginados y filtrados en el servidor). */
  initialProducts: Product[];
  /**
   * Total de productos activos en el catálogo completo (todas las páginas).
   * Se usa en el footer del sidebar.
   */
  totalProductCount: number;
  /**
   * Categorías obtenidas del servidor con su slug y conteo real.
   * Reemplaza categorySlugMap + la derivación en cliente a partir de initialProducts.
   */
  serverCategories: ServerCategory[];
}

const SORT_OPTIONS = [
  { value: 'default',    label: 'Relevancia'   },
  { value: 'price-asc',  label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'name-asc',   label: 'Nombre A-Z'   },
  { value: 'name-desc',  label: 'Nombre Z-A'   },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

// ── Sidebar inline ─────────────────────────────────────────────────────────────
interface SidebarProps {
  serverCategories: ServerCategory[];
  totalProductCount: number;
  sortOption: SortValue;
  setSortOption: (v: SortValue) => void;
}

function InlineSidebar({
  serverCategories,
  totalProductCount,
  sortOption,
  setSortOption,
}: SidebarProps) {
  const [catOpen,  setCatOpen]  = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const pathname = usePathname();
  const onProductosRoot = pathname === '/productos';

  return (
    <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
      {/* Categorías — navegación SSR a /categoria/[slug], sin filtro en memoria */}
      <div className="border-b border-slate-100">
        <button
          type="button"
          onClick={() => setCatOpen((v) => !v)}
          className="flex items-center justify-between w-full px-5 h-12 text-left text-navy"
          aria-expanded={catOpen}
        >
          <span className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight">
            <Tag size={14} className="text-slate-400" />
            Categorías
          </span>
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`grid transition-all duration-300 ease-out ${catOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <ul className="px-3 pb-4 space-y-0.5">
              <li>
                <Link
                  href="/productos"
                  className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                    onProductosRoot
                      ? 'bg-navy text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                  }`}
                >
                  <span>Todos los productos</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${onProductosRoot ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {totalProductCount}
                  </span>
                </Link>
              </li>
              {serverCategories.map((cat) => {
                const isActive = pathname === `/categoria/${cat.slug}`;
                return (
                  <li key={cat.slug}>
                    <Link
                      href={`/categoria/${cat.slug}`}
                      className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                        isActive
                          ? 'bg-navy text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                      }`}
                    >
                      <span className="truncate capitalize">{cat.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {cat.count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Ordenar */}
      <div className="border-b border-slate-100 last:border-b-0">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="flex items-center justify-between w-full px-5 h-12 text-left text-navy"
          aria-expanded={sortOpen}
        >
          <span className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight">
            <ArrowUpDown size={14} className="text-slate-400" />
            Ordenar
          </span>
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`grid transition-all duration-300 ease-out ${sortOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <ul className="px-3 pb-4 space-y-0.5">
              {SORT_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    onClick={() => setSortOption(opt.value)}
                    className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                      sortOption === opt.value
                        ? 'bg-slate-100 text-navy font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortOption === opt.value && (
                      <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 bg-slate-50">
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <SlidersHorizontal size={13} className="text-slate-400" />
          {totalProductCount} productos en total
        </div>
      </div>
    </aside>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
const ProductGridAndFilters = ({
  initialProducts,
  totalProductCount,
  serverCategories,
}: Props) => {
  const searchParams = useSearchParams();

  const [sortOption,        setSortOption]        = useState<SortValue>('default');
  const [searchTerm,        setSearchTerm]        = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sincroniza ?q= desde la URL solo en el cliente (sin afectar SSR).
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(decodeURIComponent(q));
  }, [searchParams]);

  // Ordena/filtra los productos de la página actual.
  // La categoría ya fue filtrada en el servidor → aquí solo sort + búsqueda de texto.
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term),
      );
    }

    switch (sortOption) {
      case 'price-asc':  result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'name-asc':   result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc':  result.sort((a, b) => b.name.localeCompare(a.name)); break;
      default: break;
    }

    return result;
  }, [initialProducts, searchTerm, sortOption]);

  const sidebarProps: SidebarProps = {
    serverCategories,
    totalProductCount,
    sortOption,
    setSortOption,
  };

  return (
    <section id="products" className="flex flex-col lg:flex-row gap-5 sm:gap-6 lg:gap-8 w-full max-w-full">

      {/* ── Sidebar desktop ── */}
      <div className="hidden lg:block w-[280px] flex-shrink-0">
        <div className="sticky top-[96px]">
          <InlineSidebar {...sidebarProps} />
        </div>
      </div>

      {/* ── Grid + toolbar ── */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-3 sm:p-4 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] sm:text-sm font-semibold text-navy capitalize truncate">
              Productos
              {searchTerm && (
                <span className="text-slate-500 font-normal"> · &ldquo;{searchTerm}&rdquo;</span>
              )}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-navy nums">{filteredProducts.length}</span>{' '}
              {filteredProducts.length === 1 ? 'resultado' : 'resultados'} en esta página
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

          {/* Sort select */}
          <div className="relative flex-shrink-0">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortValue)}
              aria-label="Ordenar productos"
              className="appearance-none bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-navy text-base font-semibold pl-3 pr-8 min-h-[44px] rounded-xl cursor-pointer transition-colors focus:outline-none focus:bg-white focus:shadow-ring-navy max-w-[160px] xs:max-w-none truncate"
            >
              {SORT_OPTIONS.map((o) => (
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

        {/* Chips de filtro activos */}
        {searchTerm && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-slate-500">Filtros activos:</span>
            <button
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 h-8 rounded-full hover:bg-navy-700 transition-colors"
            >
              <span className="truncate max-w-[160px]">&ldquo;{searchTerm}&rdquo;</span>
              <X size={12} />
            </button>
          </div>
        )}

        {/* Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft px-5 py-12 sm:py-20 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <SearchX size={28} />
            </div>
            <p className="mt-4 text-lg font-semibold text-navy">Sin resultados</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              Prueba con otra búsqueda o vuelve al catálogo principal.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-5 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 min-h-[44px] rounded-xl hover:bg-navy-700 active:bg-navy-800 shadow-soft hover:shadow-card transition-all"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <motion.div
            key={sortOption + searchTerm}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
          >
            {filteredProducts.map((product) => (
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

      {/* ── Sidebar móvil ── */}
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
              <InlineSidebar {...sidebarProps} />
              <button
                className="mt-5 w-full bg-navy text-white font-semibold text-sm h-12 rounded-xl hover:bg-navy-700 shadow-soft hover:shadow-card transition-all"
                onClick={() => setMobileSidebarOpen(false)}
              >
                Ver {filteredProducts.length} productos
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ProductGridAndFilters;
