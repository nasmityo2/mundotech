'use client';

import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

interface ShelfProduct {
  id:            string;
  slug?:         string | null;
  name:          string;
  price:         number;
  originalPrice?: number | null;
  images:        string[];
  category:      string;
  brand?:        string | null;
  stock:         number;
}

interface ProductShelfProps {
  title:         string;
  subtitle?:     string;
  badge?:        string;
  badgeColor?:   'yellow' | 'blue' | 'red' | 'green';
  products:      ShelfProduct[];
  viewAllHref?:  string;
  viewAllLabel?: string;
  featured?:     boolean;
  /** Fondo oscuro para home Cyber-Tech */
  theme?:        'light' | 'dark';
  /** Máximo de ítems a mostrar (desktop) */
  maxItems?:     number;
  /** Primeras N tarjetas del carrusel móvil con priority (candidatos LCP en home) */
  priorityFirstItems?: number;
}

const BADGE_COLORS: Record<string, string> = {
  yellow: 'bg-brand-yellow text-navy',
  red:    'bg-rose-500 text-white',
  blue:   'bg-sky-500 text-white',
  green:  'bg-emerald-500 text-white',
};

function toCardProduct(p: ShelfProduct) {
  return {
    id:            p.id,
    slug:          p.slug,
    name:          p.name,
    price:         p.price,
    originalPrice: p.originalPrice ?? null,
    description:   '',
    image:         p.images[0] || '/placeholder-product.png',
    images:        p.images,
    category:      p.category,
    brand:         p.brand ?? null,
    stock:         p.stock,
    details:       {},
  };
}

const ProductShelf = ({
  title,
  subtitle,
  badge,
  badgeColor = 'yellow',
  products,
  viewAllHref  = '/productos',
  viewAllLabel = 'Ver todo',
  theme = 'light',
  maxItems = 6,
  priorityFirstItems = 0,
}: ProductShelfProps) => {
  if (products.length === 0) return null;

  const cap = Math.max(4, Math.min(maxItems, 12));
  const slice = products.slice(0, cap);
  const isDark = theme === 'dark';

  return (
    <section className="py-5 sm:py-8 w-full max-w-full overflow-x-hidden">
      {/* Header row */}
      <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {badge && (
              <span className={`inline-flex text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${BADGE_COLORS[badgeColor]}`}>
                {badge}
              </span>
            )}
          </div>
          <h2 className={`text-[1.05rem] sm:text-xl font-bold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-navy'}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`text-[12px] sm:text-[13px] mt-0.5 leading-snug hidden sm:block ${isDark ? 'text-white/55' : 'text-on-light'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <Link
          href={viewAllHref}
          className={`flex items-center gap-1 text-[12px] sm:text-[13px] font-semibold whitespace-nowrap min-h-[44px] px-1 transition-colors flex-shrink-0 ${
            isDark ? 'text-[#FFD700] hover:text-[#FFE03A]' : 'text-navy hover:text-brand-yellow'
          }`}
        >
          {viewAllLabel}
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {/* Mobile: snap-x carousel · Tablet: 2-3 col · Desktop: 4-6 col */}
      <div className="-mx-4 sm:mx-0">
        {/* Mobile snap carousel */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x-mandatory px-4 pb-2 sm:hidden">
          {slice.map((product, index) => (
            <div key={product.id} className="flex-shrink-0 w-[160px] xs:w-[170px] snap-start">
              <ProductCard product={toCardProduct(product)} priority={index < priorityFirstItems} />
            </div>
          ))}
          <Link
            href={viewAllHref}
            className={`flex-shrink-0 w-[100px] flex flex-col items-center justify-center gap-2 rounded-2xl border text-[12px] font-semibold min-h-[140px] ${
              isDark
                ? 'border-white/15 bg-[#151515] text-white'
                : 'border-slate-200 bg-white text-navy shadow-sm'
            }`}
          >
            <ArrowRight size={20} aria-hidden="true" />
            Ver todo
          </Link>
        </div>

        {/* Tablet grid 2-3 col */}
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-4 lg:hidden">
          {slice.map((product) => (
            <ProductCard key={product.id} product={toCardProduct(product)} />
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden lg:grid grid-cols-4 xl:grid-cols-6 gap-4">
          {slice.map((product) => (
            <ProductCard key={product.id} product={toCardProduct(product)} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductShelf;
