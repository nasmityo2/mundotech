'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  ChevronDown,
  Tag,
  ArrowUpDown,
  Cpu,
  X,
  PackageCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SORT_OPTIONS = [
  { value: 'default',    label: 'Relevancia'   },
  { value: 'price-asc',  label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'name-asc',   label: 'Nombre A-Z'   },
  { value: 'name-desc',  label: 'Nombre Z-A'   },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

interface Props {
  q:            string;
  currentCat:   string;
  currentBrand: string;
  currentSort:  string;
  /** PRD-167: true = la URL lleva disp=all (incluye productos agotados). */
  includeOutOfStock: boolean;
  categories:   string[];
  brands:       string[];
  totalCount:   number;
  /** sidebar = panel fijo desktop | toolbar = barra superior + drawer móvil */
  variant:      'sidebar' | 'toolbar';
  filteredCount?: number;
  activePage?:  number;
}

function buildHref(
  q: string,
  cat: string,
  brand: string,
  sort: string,
  includeOutOfStock: boolean,
  page?: number,
): string {
  const params = new URLSearchParams();
  if (q)                      params.set('q',     q);
  if (cat)                    params.set('cat',   cat);
  if (brand)                  params.set('brand', brand);
  if (includeOutOfStock)      params.set('disp',  'all');
  if (sort && sort !== 'default') params.set('sort', sort);
  if (page && page > 1)       params.set('page',  String(page));
  const qs = params.toString();
  return `/buscar${qs ? `?${qs}` : ''}`;
}

// ─────────────────────────────────────────────────────────────
// Panel de filtros reutilizable (sidebar y drawer móvil)
// ─────────────────────────────────────────────────────────────
interface FilterPanelProps {
  q:                 string;
  currentCat:        string;
  currentBrand:      string;
  currentSort:         string;
  includeOutOfStock: boolean;
  categories:        string[];
  brands:            string[];
  totalCount:        number;
  onApply?:          () => void;
}

function FilterPanel({
  q,
  currentCat,
  currentBrand,
  currentSort,
  includeOutOfStock,
  categories,
  brands,
  totalCount,
  onApply,
}: FilterPanelProps) {
  const router = useRouter();
  const [catOpen,   setCatOpen]   = useState(true);
  const [brandOpen, setBrandOpen] = useState(true);
  const [sortOpen,  setSortOpen]  = useState(false);

  const navigate = (cat: string, brand: string, sort: string) => {
    router.push(buildHref(q, cat, brand, sort, includeOutOfStock));
    onApply?.();
  };

  return (
    <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">

      {/* Categorías */}
      {categories.length > 0 && (
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
          <div
            className={`grid transition-all duration-300 ease-out ${catOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <ul className="px-3 pb-4 space-y-0.5">
                <li>
                  <button
                    onClick={() => navigate('', currentBrand, currentSort)}
                    className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                      !currentCat
                        ? 'bg-navy text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                    }`}
                  >
                    <span>Todas las categorías</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        !currentCat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {totalCount}
                    </span>
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => navigate(cat, currentBrand, currentSort)}
                      className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                        currentCat === cat
                          ? 'bg-navy text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                      }`}
                    >
                      <span className="truncate capitalize">{cat}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Marcas */}
      {brands.length > 0 && (
        <div className="border-b border-slate-100">
          <button
            type="button"
            onClick={() => setBrandOpen((v) => !v)}
            className="flex items-center justify-between w-full px-5 h-12 text-left text-navy"
            aria-expanded={brandOpen}
          >
            <span className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight">
              <Cpu size={14} className="text-slate-400" />
              Marcas
            </span>
            <ChevronDown
              size={15}
              className={`text-slate-400 transition-transform duration-200 ${brandOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <div
            className={`grid transition-all duration-300 ease-out ${brandOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <ul className="px-3 pb-4 space-y-0.5">
                <li>
                  <button
                    onClick={() => navigate(currentCat, '', currentSort)}
                    className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                      !currentBrand
                        ? 'bg-navy text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                    }`}
                  >
                    <span>Todas las marcas</span>
                  </button>
                </li>
                {brands.map((brand) => (
                  <li key={brand}>
                    <button
                      onClick={() => navigate(currentCat, brand, currentSort)}
                      className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                        currentBrand === brand
                          ? 'bg-navy text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                      }`}
                    >
                      <span className="truncate">{brand}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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
        <div
          className={`grid transition-all duration-300 ease-out ${sortOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden">
            <ul className="px-3 pb-4 space-y-0.5">
              {SORT_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    onClick={() => navigate(currentCat, currentBrand, opt.value)}
                    className={`flex items-center justify-between w-full px-3 h-10 rounded-xl text-[13px] transition-colors ${
                      currentSort === opt.value
                        ? 'bg-slate-100 text-navy font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {currentSort === opt.value && (
                      <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="px-5 py-3.5 bg-slate-50">
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <SlidersHorizontal size={13} className="text-slate-400" />
          {totalCount} {totalCount === 1 ? 'producto' : 'productos'} en total
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente principal exportado
// ─────────────────────────────────────────────────────────────
export default function SearchFiltersBar(props: Props) {
  const { variant, q, currentCat, currentBrand, currentSort, includeOutOfStock, filteredCount } = props;
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (variant === 'sidebar') {
    return <FilterPanel {...props} />;
  }

  // ── Toolbar (móvil + desktop sort select) ──
  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-3 sm:p-4 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-navy truncate">
            {currentCat ? (
              <span className="capitalize">{currentCat}</span>
            ) : (
              'Todos los resultados'
            )}
            {currentBrand && (
              <span className="text-slate-500 font-normal"> · {currentBrand}</span>
            )}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            <span className="font-semibold text-navy nums">{filteredCount ?? 0}</span>{' '}
            {(filteredCount ?? 0) === 1 ? 'resultado' : 'resultados'} en esta página
          </p>
        </div>

        {/* Botón filtros móvil */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-navy text-xs font-semibold px-3 min-h-[44px] rounded-xl transition-colors flex-shrink-0"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal size={14} />
          <span className="hidden xs:inline">Filtros</span>
          {(currentCat || currentBrand) && (
            <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {(currentCat ? 1 : 0) + (currentBrand ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Sort select desktop */}
        <div className="relative flex-shrink-0">
          <select
            value={currentSort}
            onChange={(e) =>
              router.push(buildHref(q, currentCat, currentBrand, e.target.value, includeOutOfStock))
            }
            aria-label="Ordenar resultados"
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

      {/* ── Drawer filtros móvil ── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
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
                  onClick={() => setMobileOpen(false)}
                  className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-navy hover:bg-slate-100 active:bg-slate-200"
                  aria-label="Cerrar filtros"
                >
                  <X size={18} />
                </button>
              </div>
              <FilterPanel {...props} onApply={() => setMobileOpen(false)} />
              <button
                className="mt-5 w-full bg-navy text-white font-semibold text-sm h-12 rounded-xl hover:bg-navy-700 shadow-soft hover:shadow-card transition-all"
                onClick={() => setMobileOpen(false)}
              >
                Ver resultados
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
