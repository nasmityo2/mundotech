import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductGridAndFilters from '@/app/components/ProductGridAndFilters';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import JsonLd from '@/app/components/JsonLd';
import RecentlyViewed from '@/components/RecentlyViewed';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { Product } from '@/context/ProductContext';

// PRD-140 — ISR: 5 min máximo de obsolescencia para precio/stock del catálogo
// (complementado con revalidación on-demand al cambiar tasa — PRD-142).
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotechve.com';

export const metadata: Metadata = {
  // H02/P08: el template del layout añade "| MundoTech" — sin marca duplicada.
  title: 'Catálogo de tecnología y gadgets',
  description:
    'Catálogo de MundoTech Barquisimeto: gadgets, consolas, audio, computación y accesorios con garantía real. Pagas en USD o Bs y recibes en toda Venezuela.',
  alternates: {
    canonical: `${SITE_URL}/productos`,
  },
  openGraph: {
    title: 'Catálogo de tecnología y gadgets | MundoTech',
    description:
      'Gadgets, consolas, audio y accesorios en Barquisimeto. USD/Bs., garantía real.',
    url: `${SITE_URL}/productos`,
    siteName: 'MundoTech',
    locale: 'es_VE',
    type: 'website',
  },
};

// H39: breadcrumb estructurado del catálogo — alineado con el visual (Inicio → Catálogo).
const catalogBreadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio',   item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${SITE_URL}/productos` },
  ],
};

// Tipo serializable para pasar al Client Component (sin fechas ni BigInt)
type CatalogProduct = Omit<Product, 'isNew' | 'isOffer'>;

async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const rows = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      slug:          true,
      name:          true,
      description:   true,
      price:         true,
      originalPrice: true,
      stock:         true,
      category:      true,
      brand:         true,
      images:        true,
    },
  });

  return rows.map((p) => ({
    id:            p.id,
    slug:          p.slug,
    name:          p.name,
    description:   p.description ?? '',
    price:         p.price,
    originalPrice: p.originalPrice,
    stock:         p.stock,
    category:      p.category,
    brand:         p.brand,
    image:         p.images[0] ?? '/placeholder-product.png',
    images:        p.images,
    details:       {},
  }));
}

export default async function ProductosPage() {
  const products = await getCatalogProducts();

  return (
    <div className="pb-10 sm:pb-12 w-full max-w-full">
      <JsonLd data={catalogBreadcrumbSchema} />

      {/* Hero + breadcrumb */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-6 lg:p-8 mb-5 sm:mb-8">
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
            <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600 mb-2">
              <Sparkles size={11} className="text-brand-yellow" />
              Catálogo completo · Barquisimeto
            </p>
            <h1 className="text-[1.6rem] sm:text-3xl md:text-[2.25rem] font-bold text-navy tracking-tight leading-[1.05]">
              Todos los productos
            </h1>
            <p className="text-[13px] sm:text-sm text-slate-500 mt-2 max-w-xl">
              Filtra por categoría, ordena por precio y encuentra exactamente lo que buscas.
              Garantía oficial y entrega segura en cada compra desde Barquisimeto, Venezuela.
            </p>
          </div>
        </div>
      </div>

      {/*
        ProductGridAndFilters recibe los productos ya renderizados en el servidor.
        El HTML inicial contiene todos los <a href="/product/..."> con nombre y precio
        → Google los indexa sin ejecutar JS.
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
        <ProductGridAndFilters initialProducts={products as Product[]} />
      </Suspense>

      <RecentlyViewed limit={6} />
    </div>
  );
}
