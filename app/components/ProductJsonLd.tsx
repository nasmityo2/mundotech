/**
 * Inyecta los bloques JSON-LD de Schema.org para una ficha de producto:
 *   • schema:Product  +  schema:Offer
 *   • schema:BreadcrumbList
 *   • schema:LocalBusiness (MundoTech Barquisimeto) — incluido en cada ficha
 *     para reforzar la entidad local en Google.
 *
 * Uso: <ProductJsonLd product={product} />
 * Renderiza solo <script> tags; no emite HTML visible.
 */

import { slugify } from '@/lib/slugify';
import { googleMapsBusinessUrl } from '@/lib/google-maps';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotech.com.ve';

// ── Helper: construye URL Cloudinary optimizada para OG (1200×630) ──────────
function buildOgImageUrl(src: string): string {
  const CLOUDINARY_BASE = 'https://res.cloudinary.com';
  if (!src.startsWith(CLOUDINARY_BASE)) return src;

  const uploadMarker = '/image/upload/';
  const uploadIndex  = src.indexOf(uploadMarker);
  if (uploadIndex === -1) return src;

  const base       = src.slice(0, uploadIndex + uploadMarker.length);
  const publicPart = src.slice(uploadIndex + uploadMarker.length);
  const firstSeg   = publicPart.split('/')[0];
  const hasTransforms = firstSeg.includes(',') || firstSeg.includes('_');
  const cleanPart  = hasTransforms ? publicPart.replace(/^[^/]+\//, '') : publicPart;

  return `${base}f_auto,q_auto:good,w_1200,h_630,c_fill/${cleanPart}`;
}

// ── Helper: elimina etiquetas HTML de un string para uso en JSON-LD ──────────
function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ── Tipos ──────────────────────────────────────────────────────────────────
interface ProductForJsonLd {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  brand: string | null;
  category: string;
  slug: string | null;
  sku: string | null;
  images: string[];
  updatedAt: Date;
}

interface Props {
  product: ProductForJsonLd;
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function ProductJsonLd({ product }: Props) {
  const productUrl = `${SITE_URL}/product/${product.slug ?? product.id}`;
  const mainImage  = product.images[0] ?? '';
  const ogImage    = mainImage ? buildOgImageUrl(mainImage) : '';

  // Fecha de expiración del precio: 30 días desde hoy
  const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // ── 1. Product + Offer ────────────────────────────────────────────────────
  const cleanDescription = stripHtml(product.description)
    || `${product.name} disponible en MundoTech Barquisimeto. Garantía oficial.`;

  const allImages = product.images
    .map((img) => buildOgImageUrl(img))
    .filter(Boolean);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: cleanDescription,
    image: allImages.length > 0 ? allImages : (ogImage ? [ogImage] : []),
    sku: product.sku ?? product.id,
    ...(product.brand && {
      brand: { '@type': 'Brand', name: product.brand },
    }),
    category: product.category,
    url: productUrl,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: 'USD',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil,
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: 'Mundo Tech',
        url: SITE_URL,
      },
      // ── Detalles de envío (requerido por Google 2026 para rich results) ──
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '5.00',
          currency: 'USD',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'VE',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          businessDays: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: [
              'https://schema.org/Monday',
              'https://schema.org/Tuesday',
              'https://schema.org/Wednesday',
              'https://schema.org/Thursday',
              'https://schema.org/Friday',
            ],
          },
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
        },
      },
      // ── Política de devoluciones (señal de confianza para Google Shopping) ──
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'VE',
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnInStore',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  };

  // ── 2. BreadcrumbList ─────────────────────────────────────────────────────
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Catálogo',
        item: `${SITE_URL}/productos`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.category,
        item: `${SITE_URL}/categoria/${slugify(product.category)}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  // ── 3. LocalBusiness ──────────────────────────────────────────────────────
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'MundoTech',
    description:
      'Líderes en tecnología en el estado Lara. Tienda de electrónica, accesorios y electrodomésticos en Barquisimeto, Venezuela. Precios en USD y Bs., garantía oficial.',
    url: SITE_URL,
    telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+58-412-1471338',
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'ventas@mundotech.com.ve',
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/og-default.jpg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'CARRERA 21 CON ESQUINA CALLE 21 CENTRO',
      addressLocality: 'Barquisimeto',
      addressRegion: 'Lara',
      postalCode: '3001',
      addressCountry: 'VE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 10.068287498832946,
      longitude: -69.3120556394341,
    },
    hasMap: googleMapsBusinessUrl(),
    openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:30',
      closes: '17:30',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday'],
      opens: '08:30',
      closes: '18:00',
    },
    ],
    priceRange: '$$',
    currenciesAccepted: 'USD, VES',
    paymentAccepted: 'Cash, Transferencia, Pago Móvil, Binance Pay',
    areaServed: [
      { '@type': 'City', name: 'Barquisimeto' },
      { '@type': 'State', name: 'Lara' },
      { '@type': 'Country', name: 'Venezuela' },
    ],
    sameAs: [
      'https://www.instagram.com/mundotech39/',
      'https://www.facebook.com/p/Mundo-Tech-100090548322161/',
      process.env.NEXT_PUBLIC_TWITTER_URL,
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
    </>
  );
}
