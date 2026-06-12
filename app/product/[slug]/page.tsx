import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { d, dn } from '@/lib/decimal';
import { readSettings } from '@/lib/data-store';
import {
  ChevronRight, ShieldCheck, Truck, Wallet, Store, Clock,
  MessageCircle, Sparkles, Star, CheckCircle2, XCircle, Eye,
  type LucideIcon,
} from 'lucide-react';
import { readSiteContent, type TrustIcon } from '@/lib/site-content';
import ProductActions from './ProductActions';
import ProductGallery from './ProductGallery';
import { productToGalleryItems } from '@/lib/product-media';
import ProductTabs from './ProductTabs';
import StickyAddToCart from './StickyAddToCart';
import { formatCurrency } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import RecentlyViewedTracker from '@/components/RecentlyViewedTracker';
import RecentlyViewed from '@/components/RecentlyViewed';
import ProductJsonLd from '@/app/components/ProductJsonLd';
import ProductReviews from './ProductReviews';
import { Stars } from '@/components/reviews/Stars';
import { getReviewSummary, getApprovedReviews, getReviewSummariesMap } from '@/lib/reviews';
import { parseProductSpecs } from '@/lib/definitions';
import { resolveCategoryPathFromProductCategory } from '@/lib/resolve-category-path';
import { getExchangeRate } from '@/app/actions/configActions';
import { resolveSlugRedirect } from '@/lib/slug-redirects';
import { PRODUCT_CARD_SELECT, PRODUCT_DETAIL_SELECT } from '@/lib/product-select';
import type { Product as CatalogProduct } from '@/context/ProductContext';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// PRD-140 — ISR: la ficha muestra stock/precio con máximo 5 min de retraso sin
// volverse full-dynamic. Revalidación on-demand adicional: tasa (PRD-142, propio),
// quickUpdatePrice/Stock (PRD-024 → segmento 02) y delete (PRD-233 → DEPENDENCIA-05).
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotechve.com';

// H38: pre-genera las fichas en build (el ISR sigue activo para productos
// nuevos vía dynamicParams). Usa slug ?? id — mismo patrón que sitemap y enlaces.
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    select: { slug: true, id: true },
  });
  return products.map((p) => ({ slug: p.slug ?? p.id }));
}

// Clamp de meta description: 140–160 chars, corta en palabra completa y solo
// añade elipsis cuando trunca de verdad (P11/P84: nada de "…" arbitrario).
function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 110 ? lastSpace : max).trim()}…`;
}

// Las imágenes en R2 ya vienen optimizadas (webp, maxWidth en upload); usar URL tal cual.
function buildOgImageUrl(src: string): string {
  return src;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug }  = await params;
  const rawMeta   = await getProduct(slug);
  // PRD-204: normalizar Decimal → number
  const product   = rawMeta ? { ...rawMeta, price: d(rawMeta.price), originalPrice: dn(rawMeta.originalPrice) } : null;

  if (!product) {
    // P19/H28: el 404 de producto no debe quedar como soft-404 indexable.
    return {
      title: 'Producto no encontrado',
      robots: { index: false, follow: false },
    };
  }

  // P01/H05: el canonical SIEMPRE apunta a la URL con slug (la versión por id
  // además redirige 308 en el page component).
  const canonicalUrl = `${SITE_URL}/product/${product.slug ?? product.id}`;
  const mainImage    = product.images[0] ?? '';
  // P15: si el producto no tiene foto, la preview social usa la imagen de marca.
  const ogImage      = mainImage ? buildOgImageUrl(mainImage) : `${SITE_URL}/og-default.png`;

  // P08/P09 + H02: formato corto "[Producto] | MundoTech" — la marca la añade
  // una sola vez el template del layout ("%s | MundoTech").
  const title   = product.name;
  const ogTitle = `${product.name} | MundoTech`;

  // P11/P12/P84: description única por producto, 140–160 chars, desde el campo
  // real de la BD; el fallback incluye el nombre (keyword principal) y varía
  // por ficha — nunca la misma meta duplicada.
  const rawDesc = product.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
  let description: string;
  if (rawDesc.length >= 140) {
    description = clampDescription(rawDesc);
  } else if (rawDesc.length > 0) {
    description = clampDescription(
      `${rawDesc.replace(/[.!\s]+$/, '')}. Cómpralo en MundoTech Barquisimeto: precio en USD y Bs, garantía real y envío seguro a toda Venezuela.`,
    );
  } else {
    description = clampDescription(
      `Compra ${product.name} en MundoTech Barquisimeto: precio en USD y Bs, 12 meses de garantía, retiro en tienda y envío seguro a toda Venezuela.`,
    );
  }

  const keywords = [
    product.name,
    product.brand ?? '',
    product.category,
    `${product.name} precio Venezuela`,
    `${product.name} Barquisimeto`,
    'tecnología Barquisimeto',
    'MundoTech',
  ].filter(Boolean);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    // P13/H20: sin `type: 'website'` — el único og:type emitido es `product`
    // (vía `other`), coherente con el namespace product:* y los rich pins.
    openGraph: {
      title: ogTitle,
      description,
      url: canonicalUrl,
      siteName: 'MundoTech',
      locale: 'es_VE',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${product.name} — MundoTech Barquisimeto`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [ogImage],
    },
    // Open Graph de producto: og:type=product + precio, moneda y disponibilidad
    // (og:price:* / product:*) para previews de compra y Google Shopping.
    other: {
      'og:type': 'product',
      'og:price:amount': product.price.toFixed(2),
      'og:price:currency': 'USD',
      'og:availability': product.stock > 0 ? 'instock' : 'out of stock',
      'product:price:amount': product.price.toFixed(2),
      'product:price:currency': 'USD',
      'product:category': product.category,
      'product:condition': 'new',
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
      ...(product.brand && { 'product:brand': product.brand }),
    },
    // Productos sin stock mantienen index para preservar posicionamiento
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' as const },
    },
  };
}

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: PRODUCT_DETAIL_SELECT,
  });
}

async function getRelatedProducts(category: string, excludeId: string) {
  try {
    return await prisma.product.findMany({
      where: {
        category,
        id: { not: excludeId },
        stock: { gt: 0 },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: PRODUCT_CARD_SELECT,
    });
  } catch (error) {
    console.error('[ProductDetailPage] Error al cargar productos relacionados:', error);
    return [];
  }
}

// Iconos disponibles para los badges de confianza (editables en /admin/personalizar)
const TRUST_ICONS: Record<TrustIcon, LucideIcon> = {
  shield: ShieldCheck,
  truck: Truck,
  wallet: Wallet,
  store: Store,
  clock: Clock,
  whatsapp: MessageCircle,
  sparkles: Sparkles,
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [rawProduct, bsRate, siteContent, settings] = await Promise.all([
    getProduct(slug),
    getExchangeRate(),
    readSiteContent(),
    readSettings(),
  ]);

  if (!rawProduct) {
    // PRD-066: slug renombrado en el admin → redirect permanente a la URL vigente
    const redirectTarget = await resolveSlugRedirect(slug);
    if (redirectTarget) permanentRedirect(`/product/${redirectTarget}`);
    notFound();
  }

  // PRD-204: normalizar Decimal → number en la frontera BD→página
  const product = {
    ...rawProduct,
    price:         d(rawProduct.price),
    originalPrice: dn(rawProduct.originalPrice),
  };

  // P01/H05: una sola URL canónica por producto.
  if (product.slug && slug !== product.slug) {
    permanentRedirect(`/product/${product.slug}`);
  }

  const categoryPath = await resolveCategoryPathFromProductCategory(product.category);

  const mainImage = product.images[0] || '/placeholder-product.png';
  const isOut     = product.stock === 0;
  const bsPrice   = product.price * bsRate;
  const discount  = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  // PRD-223: shape explícito (sin `as any`) — coincide con el Product que
  // esperan ProductActions y el carrito (description nunca null).
  const productForClient = {
    ...product,
    description: product.description ?? '',
    image:   mainImage,
    details: {} as Record<string, string>,
  };

  const [relatedProducts, reviewSummary, productReviews] = await Promise.all([
    getRelatedProducts(product.category, product.id),
    getReviewSummary(product.id),
    getApprovedReviews(product.id),
  ]);

  const relatedSummaries = await getReviewSummariesMap(relatedProducts.map((r) => r.id));

  return (
    <div className="pb-24 lg:pb-12 w-full max-w-full">

      {/* ── Datos estructurados JSON-LD ── */}
      <ProductJsonLd
        product={product}
        categoryPath={categoryPath}
        storeName={settings.storeName}
        reviewSummary={reviewSummary}
        reviews={productReviews}
      />

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 mb-4 sm:mb-6 overflow-hidden whitespace-nowrap" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-navy transition-colors">Inicio</Link>
        <ChevronRight size={12} className="flex-shrink-0" />
        <Link href="/productos" className="hover:text-navy transition-colors">Catálogo</Link>
        <ChevronRight size={12} className="flex-shrink-0 hidden xs:block" />
        <Link
          href={categoryPath}
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
              href={categoryPath}
              className="text-[11px] sm:text-[12px] text-slate-500 hover:text-navy capitalize transition-colors"
            >
              {product.category}
            </Link>
          </div>

          {/* Título */}
          <h1 className="text-[1.4rem] xs:text-[1.55rem] sm:text-[1.75rem] md:text-[2.25rem] font-bold text-navy leading-[1.15] tracking-tight text-balance">
            {product.name}
          </h1>

          {/* Reseñas — promedio real (sin puntuación falsa) */}
          {reviewSummary.count > 0 ? (
            <a
              href="#reviews"
              className="mt-3 inline-flex items-center gap-2 text-[12px] text-slate-500 hover:text-navy transition-colors"
            >
              <Stars rating={reviewSummary.average} size={14} />
              <span className="font-semibold text-navy nums">{reviewSummary.average.toFixed(1)}</span>
              <span>· {reviewSummary.count} {reviewSummary.count === 1 ? 'reseña' : 'reseñas'}</span>
            </a>
          ) : (
            <a
              href="#reviews"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-navy transition-colors"
            >
              <Star size={13} className="text-slate-300" />
              <span>Sé el primero en reseñar este producto</span>
            </a>
          )}

          {/* Precio */}
          <div className="mt-5 sm:mt-6 pb-5 sm:pb-6 border-b border-slate-100">
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              <span className="text-[2rem] sm:text-4xl md:text-5xl font-bold text-navy nums tracking-tight leading-none">
                US {formatCurrency(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm sm:text-base text-slate-400 line-through nums">
                  US {formatCurrency(product.originalPrice)}
                </span>
              )}
              {discount && (
                <span className="inline-flex items-center bg-rose-50 text-rose-600 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                  Ahorra {discount}%
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] sm:text-sm text-slate-500 nums break-words">
              <span className="font-semibold text-navy">Bs. {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bsPrice)}</span>
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
            <ProductActions product={productForClient} />
          </div>

          {/* Trust strip — datos reales de la operación, editables en el admin */}
          <div className={`mt-7 grid gap-3 ${siteContent.productTrust.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {siteContent.productTrust.map(({ icon, title, sub }) => {
              const Icon = TRUST_ICONS[icon] ?? ShieldCheck;
              return (
                <div key={title} className="bg-slate-50 rounded-2xl p-3.5 text-center">
                  <div className="w-9 h-9 mx-auto bg-white border border-slate-200 rounded-xl flex items-center justify-center text-navy mb-2">
                    <Icon size={16} />
                  </div>
                  <p className="text-[12px] font-semibold text-navy leading-tight">{title}</p>
                  {sub ? <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{sub}</p> : null}
                </div>
              );
            })}
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
          specs={parseProductSpecs(product.specs)}
          reviewsCount={reviewSummary.count}
          reviewsAverage={reviewSummary.average}
        />
      </div>

      {/* ── Reseñas de clientes ── */}
      <ProductReviews
        productId={product.id}
        productName={product.name}
        initialSummary={reviewSummary}
        initialReviews={productReviews}
      />

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
            {relatedProducts.map(related => {
              const s = relatedSummaries.get(related.id);
              // PRD-223: mapeo tipado al Product del catálogo (sin `as any`)
              const cardProduct: CatalogProduct = {
                id:            related.id,
                slug:          related.slug,
                name:          related.name,
                description:   related.description ?? '',
                // PRD-204: convertir Decimal → number
                price:         d(related.price),
                originalPrice: dn(related.originalPrice),
                stock:         related.stock,
                category:      related.category,
                brand:         related.brand,
                image:         related.images[0] || '/placeholder-product.png',
                images:        related.images,
                details:       {},
                rating:        s?.average,
                reviewCount:   s?.count,
              };
              return <ProductCard key={related.id} product={cardProduct} />;
            })}
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
