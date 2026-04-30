import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ChevronRight, Tag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/context/ProductContext';

// ISR: reconstruye cada categoría cada hora
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotech.com.ve';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ── Helpers de datos ──────────────────────────────────────────────────────
async function getCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
  });
}

async function getCategoryProducts(categoryName: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category: categoryName },
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

// ── Generación estática de parámetros ─────────────────────────────────────
export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });
  return categories.map((cat) => ({ slug: cat.slug }));
}

// ── Metadata dinámica por categoría ──────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return { title: 'Categoría no encontrada — MundoTech' };
  }

  const canonicalUrl = `${SITE_URL}/categoria/${category.slug}`;
  const title        = `${category.name} en Barquisimeto — MundoTech | Mejor precio Venezuela`;
  const description  = `Compra ${category.name} en MundoTech Barquisimeto. Líderes en tecnología en el estado Lara. Precio en USD y Bs., garantía oficial, stock disponible y envío seguro a todo Venezuela.`;

  return {
    title,
    description,
    keywords: [
      category.name,
      `${category.name} Barquisimeto`,
      `${category.name} Venezuela`,
      `${category.name} precio`,
      'MundoTech',
      'tecnología Barquisimeto',
      'estado Lara tecnología',
    ],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'MundoTech',
      locale: 'es_VE',
      type: 'website',
      ...(category.imageUrl && {
        images: [{ url: category.imageUrl, width: 1200, height: 630, alt: category.name }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ── JSON-LD CollectionPage ─────────────────────────────────────────────────
function CategoryJsonLd({
  category,
  products,
  slug,
}: {
  category: { name: string; description?: string | null };
  products: Product[];
  slug: string;
}) {
  const url = `${SITE_URL}/categoria/${slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} — MundoTech`,
    description:
      category.description ??
      `Catálogo de ${category.name} en MundoTech, líderes en tecnología en el estado Lara, Barquisimeto.`,
    url,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio',   item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${SITE_URL}/productos` },
        { '@type': 'ListItem', position: 3, name: category.name, item: url },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 20).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/product/${p.slug ?? p.id}`,
        name: p.name,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── Página ─────────────────────────────────────────────────────────────────
export default async function CategoryPage({ params }: PageProps) {
  const { slug }    = await params;
  const category    = await getCategory(slug);

  if (!category) notFound();

  const products = await getCategoryProducts(category.name);

  return (
    <div className="pb-10 sm:pb-12 w-full max-w-full">
      <CategoryJsonLd category={category} products={products} slug={slug} />

      {/* Hero de categoría */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-8 mb-6 sm:mb-8 overflow-hidden">
        {category.imageUrl && (
          <Image
            src={category.imageUrl}
            alt={`Categoría ${category.name}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 80vw"
            className="object-cover opacity-[0.06]"
          />
        )}
        <div className="relative">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mb-4 truncate"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-navy transition-colors">Inicio</Link>
            <ChevronRight size={12} className="flex-shrink-0" />
            <Link href="/productos" className="hover:text-navy transition-colors">Catálogo</Link>
            <ChevronRight size={12} className="flex-shrink-0" />
            <span className="text-navy font-medium capitalize">{category.name}</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600 mb-2">
            <Tag size={11} />
            Categoría
          </span>

          <h1 className="text-[1.75rem] sm:text-3xl md:text-[2.25rem] font-bold text-navy tracking-tight leading-tight capitalize">
            {category.name}
          </h1>

          <p className="mt-2 text-[13px] sm:text-sm text-slate-500 max-w-2xl">
            Los mejores productos de <strong>{category.name}</strong> en MundoTech,
            líderes en tecnología en el estado Lara, Barquisimeto. Precio en USD y Bs.,
            garantía oficial y envío seguro a todo Venezuela.
          </p>

          <p className="mt-3 text-xs text-slate-400">
            {products.length} {products.length === 1 ? 'producto disponible' : 'productos disponibles'}
          </p>
        </div>
      </div>

      {/* Grid de productos — HTML indexable sin JS */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft px-5 py-16 text-center">
          <p className="text-lg font-semibold text-navy">Sin productos en esta categoría</p>
          <p className="mt-1 text-sm text-slate-500">Pronto añadiremos más artículos.</p>
          <Link
            href="/productos"
            className="mt-5 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 min-h-[44px] rounded-xl hover:bg-navy-700 shadow-soft transition-all"
          >
            Ver catálogo completo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
