import dynamic from 'next/dynamic';
import HomeHeroCyber from '@/app/components/HomeHeroCyber';
import PromoBanners from '@/app/components/PromoBanners';
import DiscoverMosaic from '@/app/components/DiscoverMosaic';
import CategoryRow from '@/app/components/CategoryRow';
import ProductShelf from '@/app/components/ProductShelf';
import Benefits, { type BenefitItem } from '@/app/components/Benefits';
import { DEFAULT_SITE_CONTENT } from '@/lib/site-content';
import { DEFAULT_SETTINGS } from '@/lib/data-store';
import type { SiteContent } from '@/lib/site-content-schema';
import type { StoreSettings } from '@/lib/data-store';
import {
  getCachedNewestProducts,
  getCachedFlashDeals,
  getCachedGamingProducts,
  getCachedHeroBanners,
  getCachedHomePromoBanners,
  getCachedHomeDiscoverBanners,
  getCachedHomeFeaturedCategories,
  getCachedCtaBanner,
  getCachedHomePromotions,
  getCachedHomepageConfig,
  getCachedHomeSiteContent,
  getCachedHomeSettings,
  getCachedGamingPath,
} from '@/lib/home-cache';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

const Promotions = dynamic(() => import('@/app/components/Promotions'));

// PRD-140 — ISR: 5 min máximo de obsolescencia para precio/stock visibles.
// Las mutaciones relevantes también revalidan on-demand: tasa USD/Bs en
// configActions.updateExchangeRate (PRD-142); precio/stock de producto en
// quickUpdate* (PRD-024, segmento 02) y delete (PRD-233, ver DEPENDENCIA-05).
export const revalidate = 300;

export const metadata: Metadata = {
  // H02/P08: título absoluto — ya lleva la marca, el template no la duplica.
  title: { absolute: 'MundoTech Barquisimeto | Tecnología, gadgets y variedades' },
  // P89/H58: sin la promesa "Delivery en 24h" (contradecía /shipping-policy);
  // 140–160 chars con keyword principal "tecnología en Barquisimeto".
  description:
    'Tienda de variedades en Barquisimeto: tecnología, gadgets, hogar, cocina, fitness, salud y cuidado personal. Paga en USD o Bs y recibe en toda Venezuela.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'MundoTech Barquisimeto | Tecnología, gadgets y variedades',
    description:
      'Tecnología, hogar, cocina, fitness y mucho más en Barquisimeto. Paga en USD o Bs. Envíos a toda Venezuela.',
    url: '/',
    siteName: 'MundoTech',
    locale: 'es_VE',
    type: 'website',
  },
};

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

/**
 * PRD-113 / PRD-258: fallback de beneficios construido desde las fuentes de
 * verdad vivas (site-content + settings) — una sola versión del claim de
 * delivery y del teléfono en home y ficha de producto, sin hardcode en UI.
 */
function buildBenefitsFallback(siteContent: SiteContent, settings: StoreSettings): BenefitItem[] {
  const trustItems: BenefitItem[] = siteContent.productTrust.map((t) => ({
    title: t.title,
    sub:   t.sub,
  }));
  const whatsappItem: BenefitItem | null = settings.phone
    ? {
        title: 'WhatsApp directo con el equipo',
        sub:   `${settings.phone} · te respondemos rápido`,
      }
    : null;
  // Orden visual: delivery primero si existe, luego garantía, WhatsApp y pagos (máx. 4).
  const ordered = [
    ...trustItems.slice(0, 2),
    ...(whatsappItem ? [whatsappItem] : []),
    ...trustItems.slice(2),
  ];
  return ordered.slice(0, 4);
}

async function getData() {
  // PRD-138: la home es ISR — sin try/catch, un fallo puntual de BD durante la
  // regeneración rompe la página completa. Con fallbacks seguros, la home
  // renderiza vacía-pero-viva y el error queda registrado.
  try {
    const [
      newestProducts,
      flashDeals,
      gamingProducts,
      heroBanners,
      promoBanners,
      discoverBanners,
      featuredCategories,
      ctaBannerRow,
      activePromotions,
      { shelvesConfig, benefitsConfig },
      siteContent,
      settings,
      gamingPath,
    ] = await Promise.all([
      getCachedNewestProducts(),
      getCachedFlashDeals(),
      getCachedGamingProducts(),
      getCachedHeroBanners(),
      getCachedHomePromoBanners(),
      getCachedHomeDiscoverBanners(),
      getCachedHomeFeaturedCategories(),
      getCachedCtaBanner(),
      getCachedHomePromotions(),
      getCachedHomepageConfig(),
      getCachedHomeSiteContent(),
      getCachedHomeSettings(),
      getCachedGamingPath(),
    ]);

    return {
      newestProducts,
      flashDeals,
      gamingProducts,
      heroBanners,
      promoBanners,
      discoverBanners,
      featuredCategories,
      ctaBannerRow,
      activePromotions,
      shelvesConfig,
      benefitsConfig,
      siteContent,
      settings,
      gamingPath,
    };
  } catch (error) {
    console.error('[home] getData falló — se renderiza con fallbacks seguros:', error);
    return {
      newestProducts: [],
      flashDeals: [],
      gamingProducts: [],
      heroBanners: [],
      promoBanners: [],
      discoverBanners: [],
      featuredCategories: [],
      ctaBannerRow: null,
      activePromotions: [],
      shelvesConfig: null,
      benefitsConfig: null,
      siteContent: DEFAULT_SITE_CONTENT,
      settings: DEFAULT_SETTINGS,
      gamingPath: '/productos',
    };
  }
}

function CtaBanner({ data }: { data: CtaBannerData | null }) {
  const title =
    data?.title ?? 'Lo que ves aquí, lo tenemos en la tienda.';
  const subtitle =
    data?.subtitle ??
    'Catálogo con stock real del local en Carrera 21 con esquina calle 21, Centro, Barquisimeto 3001. Si lo quieres ya, pásate por la tienda; si no, te lo enviamos.';
  const badge = data?.label ?? 'Catálogo completo · Barquisimeto';
  const ctaText = data?.ctaText ?? 'Explorar todo el catálogo';
  const link = data?.link ?? '/productos';
  const img = data?.imageUrl ?? '';

  return (
    <div className="relative mt-6 sm:mt-8 overflow-hidden card-elevated-lg">
      {img ? (
        <Image
          src={img}
          alt="Tecnología MundoTech"
          fill
          sizes="100vw"
          quality={80}
          className="object-cover opacity-[0.07]"
        />
      ) : null}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-[#FFD700]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 sm:h-56 sm:w-56 rounded-full bg-navy/10 blur-2xl" />

      <div className="relative flex flex-col items-center justify-between gap-4 sm:gap-5 px-5 py-7 sm:flex-row sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <div className="text-center sm:text-left w-full sm:w-auto sm:flex-1">
          <span className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#E6C200]/60 bg-[#FFF8D1] px-3 py-1 text-[10px] sm:text-[11px] font-semibold text-amber-800">
            <Sparkles size={11} className="text-amber-700" aria-hidden="true" />
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


const HomePage = async () => {
  const {
    newestProducts,
    flashDeals,
    gamingProducts,
    heroBanners,
    promoBanners,
    discoverBanners,
    featuredCategories,
    ctaBannerRow,
    activePromotions,
    shelvesConfig,
    benefitsConfig,
    siteContent,
    settings,
    gamingPath,
  } = await getData();

  // Beneficios: config del admin si existe; si no, fallback desde las fuentes
  // vivas (site-content + settings) — PRD-113 / PRD-258.
  const benefitsItems =
    benefitsConfig && benefitsConfig.length > 0
      ? benefitsConfig
      : buildBenefitsFallback(siteContent, settings);

  const novedadesTitle = shelvesConfig?.newest?.title ?? 'Novedades en MundoTech';
  const novedadesBadge = shelvesConfig?.newest?.badge ?? 'Recién llegados';

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Hero — ancho completo solo en móvil (< sm); desde sm conserva el padding del container */}
      <div className="-mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full">
        <div className="-mt-1 sm:-mt-2">
          <HomeHeroCyber
            slides={heroBanners.length > 0 ? heroBanners : undefined}
            fallback={siteContent.heroFallback}
            brandStrip={siteContent.brandStrip}
            priorityImages={true}
          />
        </div>
      </div>

      <div className="mt-4 sm:mt-6">
        <PromoBanners banners={promoBanners} />
      </div>

      {/* Barra de beneficios — editable desde Admin → Gestor Home */}
      <div className="-mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full mt-4 sm:mt-6">
        <div className="overflow-hidden rounded-none border-y border-border bg-surface-muted sm:rounded-2xl sm:border sm:shadow-soft">
          <Benefits items={benefitsItems} />
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-hidden mt-5 sm:mt-8">
        <div className="w-full max-w-full pb-12 pt-1 sm:pt-2">
          <ProductShelf
            badge="Ofertas"
            badgeColor="red"
            title="Ofertas del Día"
            subtitle="Precios especiales por tiempo limitado"
            products={flashDeals}
            viewAllHref="/ofertas"
            viewAllLabel="Ver todas las ofertas"
            theme="light"
            maxItems={8}
            priorityFirstItems={0}
          />

          <DiscoverMosaic banners={discoverBanners} />

          <CategoryRow categories={featuredCategories} />

          <ProductShelf
            badge={novedadesBadge}
            badgeColor="yellow"
            title={novedadesTitle}
            products={newestProducts}
            viewAllHref="/productos"
            viewAllLabel="Ver todas las novedades"
            theme="light"
            maxItems={8}
            priorityFirstItems={0}
          />

          <ProductShelf
            badge="Gaming"
            badgeColor="yellow"
            title="Consolas y gaming"
            subtitle="Consolas portátiles y accesorios para jugar donde quieras."
            products={gamingProducts}
            viewAllHref={gamingPath}
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

          <CtaBanner data={ctaBannerRow} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
