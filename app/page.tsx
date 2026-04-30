import { prisma } from '@/lib/prisma';
import HomeHeroCyber from '@/app/components/HomeHeroCyber';
import Promotions from '@/app/components/Promotions';
import ProductShelf from '@/app/components/ProductShelf';
import FlashDeals from '@/app/components/FlashDeals';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';

// ISR: reconstruye la home cada hora para TTFB óptimo sin datos obsoletos
export const revalidate = 3600;

interface CtaBannerData {
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  label: string | null;
  ctaText: string | null;
  link: string | null;
}

interface ShelfConfig {
  title: string;
  badge: string;
  subtitle: string;
}

interface ShelvesConfig {
  bestsellers: ShelfConfig;
  newest: ShelfConfig;
  recommended: ShelfConfig;
}

async function getData() {
  const [products, heroBanners, ctaBannerRow, activePromotions, configRows] =
    await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          originalPrice: true,
          images: true,
          category: true,
          brand: true,
          stock: true,
        },
      }),
      prisma.banner.findMany({
        where: { type: 'hero', active: true },
        orderBy: [{ order: 'asc' }],
        take: 10,
      }),
      prisma.banner.findFirst({
        where: { type: 'cta_banner', active: true },
        orderBy: [{ order: 'asc' }],
      }),
      prisma.promotion.findMany({
        where: { active: true },
        orderBy: [{ order: 'asc' }],
        take: 3,
      }),
      prisma.appConfig.findMany({
        where: { key: { in: ['homepage_flashdeals', 'homepage_shelves'] } },
      }),
    ]);

  const configMap = Object.fromEntries(
    configRows.map((r) => {
      try {
        return [r.key, JSON.parse(r.value)];
      } catch {
        return [r.key, null];
      }
    })
  );

  return {
    products,
    heroBanners,
    ctaBannerRow,
    activePromotions,
    flashConfig: configMap['homepage_flashdeals'] as { title: string; endHour: number } | null,
    shelvesConfig: configMap['homepage_shelves'] as ShelvesConfig | null,
  };
}

const DEFAULT_CTA_IMAGE =
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=max&w=1920&q=95';

function CtaBanner({ data }: { data: CtaBannerData | null }) {
  const title =
    data?.title ?? 'Todo lo que buscas en tecnología, en un solo lugar.';
  const subtitle =
    data?.subtitle ??
    'Filtra por categoría, marca y precio. Garantía oficial en cada producto.';
  const badge = data?.label ?? 'Catálogo completo · Barquisimeto';
  const ctaText = data?.ctaText ?? 'Ir al catálogo';
  const link = data?.link ?? '/productos';
  const img = data?.imageUrl ?? DEFAULT_CTA_IMAGE;

  return (
    <div className="relative mt-6 sm:mt-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card">
      <Image
        src={img}
        alt="Tecnología MundoTech"
        fill
        sizes="100vw"
        quality={90}
        className="object-cover opacity-[0.07]"
      />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-[#FFD700]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 sm:h-56 sm:w-56 rounded-full bg-cyan-400/15 blur-2xl" />

      <div className="relative flex flex-col items-center justify-between gap-4 sm:gap-5 px-5 py-7 sm:flex-row sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <div className="text-center sm:text-left w-full sm:w-auto sm:flex-1">
          <span className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#E6C200]/60 bg-[#FFF8D1] px-3 py-1 text-[10px] sm:text-[11px] font-semibold text-[#9a7b00]">
            <Sparkles size={11} className="text-[#FFD700]" aria-hidden />
            {badge}
          </span>
          <h2 className="text-balance text-[1.25rem] xs:text-[1.4rem] sm:text-2xl md:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-navy leading-tight">
            {title}
          </h2>
          <p className="mt-2 max-w-lg text-[13px] sm:text-[14px] font-medium text-slate-600 mx-auto sm:mx-0">{subtitle}</p>
        </div>
        <Link
          href={link}
          className="btn-mundotech-shimmer w-full sm:w-auto inline-flex min-h-[52px] flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E6C200] bg-[#FFD700] px-6 sm:px-7 text-[13px] sm:text-sm font-black text-black shadow-md transition-all duration-300 active:scale-[0.98] hover:bg-[#FFE03A]"
        >
          {ctaText} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function productHaystack(p: {
  name: string;
  category: string;
  brand: string | null;
}) {
  return `${p.category} ${p.name} ${p.brand ?? ''}`.toLowerCase();
}

type HomeProduct = (typeof getData extends () => Promise<infer R> ? R : never)['products'][number];

function pickGaming(products: HomeProduct[]) {
  const re =
    /consola|gaming|retro|game|handheld|r36|portátil|portatil|nintendo|playstation|xbox|steam/;
  const hit = products.filter((p) => re.test(productHaystack(p)));
  return hit.length >= 3 ? hit : products;
}

const HomePage = async () => {
  const {
    products,
    heroBanners,
    ctaBannerRow,
    activePromotions,
    flashConfig,
    shelvesConfig,
  } = await getData();

  const flashDeals = products
    .filter((p) => p.originalPrice && p.originalPrice > p.price)
    .slice(0, 10);
  const flashFallback = products.slice(0, 10);

  const novedadesTitle = shelvesConfig?.newest?.title ?? 'Novedades en MundoTech';
  const novedadesBadge = shelvesConfig?.newest?.badge ?? 'Recién llegados';

  const newest = products.slice(0, 8);
  const gaming = pickGaming(products).slice(0, 8);

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Hero — ancho completo solo en móvil (< sm); desde sm conserva el padding del container */}
      <div className="-mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full">
        <div className="-mt-1 sm:-mt-2">
          <HomeHeroCyber
            slides={heroBanners.length > 0 ? heroBanners : undefined}
          />
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-hidden mt-5 sm:mt-8">
        <div className="w-full max-w-full pb-12 pt-1 sm:pt-2">
          <ProductShelf
            badge={novedadesBadge}
            badgeColor="yellow"
            title={novedadesTitle}
            products={newest}
            viewAllHref="/productos"
            viewAllLabel="Ver todas las novedades"
            theme="light"
            maxItems={8}
          />

          <ProductShelf
            badge="Gaming"
            badgeColor="yellow"
            title="Consolas y gaming"
            subtitle="Consolas portátiles y accesorios para jugar donde quieras."
            products={gaming}
            viewAllHref="/productos?cat=Consolas"
            viewAllLabel="Ver gaming"
            theme="light"
            maxItems={8}
          />

          <div className="mt-6 sm:mt-8">
            <Promotions
              promotions={
                activePromotions.length > 0 ? activePromotions : undefined
              }
            />
          </div>

          <div className="mt-8 sm:mt-10">
            <FlashDeals
              products={flashDeals.length > 0 ? flashDeals : flashFallback}
              title={flashConfig?.title ?? 'Ofertas MundoTech'}
              endHour={flashConfig?.endHour ?? 23}
            />
          </div>

          <CtaBanner data={ctaBannerRow} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
