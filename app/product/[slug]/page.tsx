import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  ChevronRight, ShieldCheck, Truck, RefreshCcw,
  Star, CheckCircle2, XCircle, Eye,
} from 'lucide-react';
import ProductActions from './ProductActions';
import ProductGallery from './ProductGallery';
import { productToGalleryItems } from '@/lib/product-media';
import ProductTabs from './ProductTabs';
import StickyAddToCart from './StickyAddToCart';
import { formatCurrency } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import RecentlyViewedTracker from '@/components/RecentlyViewedTracker';
import RecentlyViewed from '@/components/RecentlyViewed';

const BS_RATE = Number(process.env.NEXT_PUBLIC_BS_RATE ?? '36.5');

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Producto no encontrado — MundoTech' };
  return {
    title:       `${product.name} — MundoTech`,
    description: product.description ?? `Compra ${product.name} en MundoTech. Garantía oficial y envío seguro.`,
  };
}

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: { media: { orderBy: { sortOrder: 'asc' } } },
  });
}

async function getRelatedProducts(category: string, excludeId: string) {
  return prisma.product.findMany({
    where: {
      category,
      id: { not: excludeId },
      stock: { gt: 0 },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product  = await getProduct(slug);

  if (!product) notFound();

  const mainImage = product.images[0] || '/placeholder-product.png';
  const isOut     = product.stock === 0;
  const bsPrice   = product.price * BS_RATE;
  const discount  = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const productForClient = {
    ...product,
    image:   mainImage,
    details: {} as Record<string, string>,
  };

  const relatedProducts = await getRelatedProducts(product.category, product.id);

  return (
    <div className="pb-24 lg:pb-12 w-full max-w-full">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 mb-4 sm:mb-6 overflow-hidden whitespace-nowrap" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-navy transition-colors">Inicio</Link>
        <ChevronRight size={12} className="flex-shrink-0" />
        <Link href="/productos" className="hover:text-navy transition-colors">Catálogo</Link>
        <ChevronRight size={12} className="flex-shrink-0 hidden xs:block" />
        <Link
          href={`/productos?cat=${encodeURIComponent(product.category)}`}
          className="hover:text-navy transition-colors capitalize hidden xs:inline"
        >
          {product.category}
        </Link>
        <ChevronRight size={12} className="flex-shrink-0" />
        <span className="text-navy font-medium truncate flex-1 min-w-0">{product.name}</span>
      </nav>

      {/* ── Layout principal 2 cols ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start mb-8 sm:mb-12">

        {/* Galería */}
        <ProductGallery
          items={productToGalleryItems(product)}
          name={product.name}
          isOut={isOut}
          discountPct={discount}
        />

        {/* Información */}
        <div className="flex flex-col">

          {/* Marca + categoría */}
          <div className="flex items-center gap-2 flex-wrap mb-2 sm:mb-3">
            {product.brand && (
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                {product.brand}
              </span>
            )}
            <span className="text-slate-300">·</span>
            <Link
              href={`/productos?cat=${encodeURIComponent(product.category)}`}
              className="text-[11px] sm:text-[12px] text-slate-500 hover:text-navy capitalize transition-colors"
            >
              {product.category}
            </Link>
          </div>

          {/* Título */}
          <h1 className="text-[1.4rem] xs:text-[1.55rem] sm:text-[1.75rem] md:text-[2.25rem] font-bold text-navy leading-[1.15] tracking-tight text-balance">
            {product.name}
          </h1>

          {/* Rating + reviews link */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star
                  key={s}
                  size={14}
                  className={s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-navy nums">4.0</span>
            <span className="text-sm text-slate-400">·</span>
            <a href="#tabs" className="text-sm text-slate-500 hover:text-navy transition-colors">
              Ver reseñas
            </a>
          </div>

          {/* Precio */}
          <div className="mt-5 sm:mt-6 pb-5 sm:pb-6 border-b border-slate-100">
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              <span className="text-[2rem] sm:text-4xl md:text-5xl font-bold text-navy nums tracking-tight leading-none">
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm sm:text-base text-slate-400 line-through nums">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
              {discount && (
                <span className="inline-flex items-center bg-rose-50 text-rose-600 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                  Ahorra {discount}%
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] sm:text-sm text-slate-500 nums break-words">
              Equivalente a <span className="font-semibold text-navy">Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(bsPrice)}</span>
              <span className="text-slate-400 hidden xs:inline"> · tasa Bs.{BS_RATE.toFixed(2)}/USD</span>
            </p>
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 mt-5">
            {isOut ? (
              <span className="inline-flex items-center gap-1.5 text-rose-600 text-sm font-semibold">
                <XCircle size={15} /> Sin existencias
              </span>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                  <CheckCircle2 size={15} /> En stock — {product.stock} disponibles
                </span>
              </>
            )}
          </div>

          {/* Acciones */}
          <div className="mt-6">
            <ProductActions product={productForClient as any} />
          </div>

          {/* Trust strip */}
          <div className="mt-7 grid grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, label: 'Garantía oficial', sub: 'Producto original' },
              { icon: Truck,       label: 'Envío seguro',     sub: 'Trackeable 24-48h' },
              { icon: RefreshCcw,  label: 'Devolución 7d',   sub: 'Si llega defectuoso' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-3.5 text-center">
                <div className="w-9 h-9 mx-auto bg-white border border-slate-200 rounded-xl flex items-center justify-center text-navy mb-2">
                  <Icon size={16} />
                </div>
                <p className="text-[12px] font-semibold text-navy leading-tight">{label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div id="tabs" className="mb-12">
        <ProductTabs
          description={product.description}
          brand={product.brand}
          category={product.category}
          sku={product.sku}
          isOut={isOut}
          stock={product.stock}
        />
      </div>

      {/* ── También te puede interesar ── */}
      {relatedProducts.length > 0 && (
        <div className="mt-8 sm:mt-12">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Eye size={18} className="text-slate-400" />
            <h2 className="text-[1.3rem] sm:text-2xl md:text-[1.75rem] font-bold text-navy tracking-tight">
              También te puede interesar
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
            {relatedProducts.map(related => (
              <ProductCard
                key={related.id}
                product={{
                  ...related,
                  image: related.images[0] || '/placeholder-product.png',
                  description: related.description || '',
                  details: {},
                } as any}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Vistos recientemente ── */}
      <RecentlyViewed excludeId={product.id} limit={6} />

      {/* ── Tracker (no UI) ── */}
      <RecentlyViewedTracker
        id={product.id}
        slug={product.slug}
        name={product.name}
        price={product.price}
        image={mainImage}
        brand={product.brand}
        category={product.category}
      />

      {/* ── Sticky add-to-cart en mobile ── */}
      <StickyAddToCart
        product={{
          id:    product.id,
          name:  product.name,
          price: product.price,
          image: mainImage,
          stock: product.stock,
        }}
      />
    </div>
  );
}
