import { Suspense } from 'react';
import Link from 'next/link';
import ProductGridAndFilters from '@/app/components/ProductGridAndFilters';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import RecentlyViewed from '@/components/RecentlyViewed';
import { ChevronRight, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Catálogo completo — MundoTech',
  description: 'Explora todos nuestros productos de tecnología con filtros por categoría y precio.',
};

const ProductosPage = () => (
  <div className="pb-10 sm:pb-12 w-full max-w-full">
    {/* Breadcrumb + hero */}
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-6 lg:p-8 mb-5 sm:mb-8">
      <nav className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mb-3 truncate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-navy transition-colors">Inicio</Link>
        <ChevronRight size={12} className="flex-shrink-0" />
        <span className="text-navy font-medium">Catálogo</span>
      </nav>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600 mb-2">
            <Sparkles size={11} className="text-brand-yellow" />
            Catálogo completo
          </p>
          <h1 className="text-[1.6rem] sm:text-3xl md:text-[2.25rem] font-bold text-navy tracking-tight leading-[1.05]">
            Todos los productos
          </h1>
          <p className="text-[13px] sm:text-sm text-slate-500 mt-2 max-w-xl">
            Filtra por categoría, ordena por precio y encuentra exactamente lo que buscas.
            Garantía oficial y entrega segura en cada compra.
          </p>
        </div>
      </div>
    </div>

    <Suspense
      fallback={
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      }
    >
      <ProductGridAndFilters />
    </Suspense>

    <RecentlyViewed limit={6} />
  </div>
);

export default ProductosPage;
