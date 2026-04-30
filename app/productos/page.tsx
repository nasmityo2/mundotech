import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductGridAndFilters from '@/app/components/ProductGridAndFilters';
import RecentlyViewed from '@/components/RecentlyViewed';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { Product } from '@/context/ProductContext';

// ISR: reconstruye la página cada hora en el servidor
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotech.com.ve';

export const metadata: Metadata = {
  title: 'Catálogo · Tecnología, gadgets y cocina mesa compacta — MundoTech',
  description:
    'Catálogo MundoTech Barquisimeto: tecnología práctica, gadgets, inventos y electrodomésticos para cocina de mesa compacta —no grandes neveras ni cocinas completas—. Consolas retro y accesorios trending. Sin celulares. Filtra por categoría y garantía oficial.',
  alternates: {
    canonical: `${SITE_URL}/productos`,
  },
  openGraph: {
    title: 'Catálogo MundoTech — gadgets, tecnología y electro cocina',
    description:
      'Gadgets, tecnología, consolas y electrodomésticos de cocina mesa compacta en Barquisimeto. Sin celulares. USD/Bs., garantía oficial.',
    url: `${SITE_URL}/productos`,
    siteName: 'MundoTech',
    locale: 'es_VE',
    type: 'website',
  },
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
              <div
                key={i}
                className="rounded-2xl bg-slate-100 animate-pulse aspect-[3/4]"
              />
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
