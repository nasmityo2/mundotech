import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin, Phone, Mail, Clock, ShieldCheck,
  Truck, RefreshCcw, Star, ArrowRight, Navigation,
} from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotech.com.ve';
const PAGE_URL = `${SITE_URL}/tienda-barquisimeto`;

// ── Metadata On-Page optimizada para SEO local ─────────────────────────────
export const metadata: Metadata = {
  title: 'Tienda de Tecnología en Barquisimeto — Mundo Tech | Conectados Contigo',
  description:
    'Visita Mundo Tech en el Centro de Barquisimeto, Estado Lara. Electrónica, smartphones, consolas gaming, accesorios y electrodomésticos. Precios en USD y Bs., garantía oficial y atención personalizada.',
  keywords: [
    'tienda tecnología Barquisimeto',
    'electrónica Barquisimeto centro',
    'Mundo Tech Barquisimeto',
    'smartphones Barquisimeto',
    'consolas gaming Lara Venezuela',
    'electrodomésticos Barquisimeto',
    'accesorios tech estado Lara',
    'tienda física tecnología Venezuela',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Mundo Tech Barquisimeto — Conectados Contigo',
    description:
      'Tu tienda de tecnología en el corazón de Barquisimeto. Visítanos en Carrera 21 con Calle 21, Centro. Lunes a viernes 8 AM – 6 PM.',
    url: PAGE_URL,
    siteName: 'Mundo Tech',
    locale: 'es_VE',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: 'Mundo Tech — Tienda de Tecnología en Barquisimeto',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mundo Tech Barquisimeto — Conectados Contigo',
    description:
      'Visítanos en el Centro de Barquisimeto. Electrónica, gaming y más con garantía oficial.',
    images: [`${SITE_URL}/og-default.jpg`],
  },
};

// ── Schema LocalBusiness específico para esta landing ─────────────────────
const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'ElectronicsStore',
  name: 'Mundo Tech',
  alternateName: 'MundoTech Barquisimeto',
  slogan: 'Conectados Contigo',
  description:
    'Tienda de tecnología, electrónica, smartphones, consolas gaming, accesorios y electrodomésticos en Barquisimeto, Estado Lara, Venezuela. Precios en USD y Bs., garantía oficial y atención personalizada.',
  url: PAGE_URL,
  telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+58-412-1471338',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'ventas@mundotech.com.ve',
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-default.jpg`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Carrera 21 con esquina Calle 21, Centro',
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
  hasMap: 'https://maps.app.goo.gl/GcDJWF54nFUseByNA',
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
  paymentAccepted: 'Cash, Transferencia Bancaria, Pago Móvil, Binance Pay, Zelle',
  areaServed: [
    { '@type': 'City',    name: 'Barquisimeto' },
    { '@type': 'State',   name: 'Lara' },
    { '@type': 'Country', name: 'Venezuela' },
  ],
  sameAs: [
    'https://www.instagram.com/mundotech39/',
    'https://www.facebook.com/p/Mundo-Tech-100090548322161/',
  ],
};

// ── BreadcrumbList para esta página ──────────────────────────────────────
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio',             item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Tienda Barquisimeto', item: PAGE_URL },
  ],
};

// ── Datos de confianza ────────────────────────────────────────────────────
const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Garantía oficial',
    desc: 'Todos nuestros productos son originales con garantía de fábrica.',
  },
  {
    icon: Truck,
    title: 'Envío a todo Venezuela',
    desc: 'Despacho seguro y rastreable en 24–48 h hábiles a cualquier estado.',
  },
  {
    icon: RefreshCcw,
    title: 'Devolución en 7 días',
    desc: 'Si tu producto llega con defecto, lo cambiamos sin costo adicional.',
  },
  {
    icon: Star,
    title: 'Atención personalizada',
    desc: 'Nuestro equipo te asesora para elegir el mejor producto para ti.',
  },
];

const HOURS = [
  { day: 'Lunes – Viernes', hours: '8:30 AM – 5:30 PM' },
  { day: 'Sábado',          hours: '8:30 AM – 6:00 PM' },
  { day: 'Domingo',         hours: 'Cerrado' },
];

const CATEGORIES = [
  { label: 'Smartphones',     href: '/productos?cat=Smartphones' },
  { label: 'Consolas Gaming', href: '/productos?cat=Consolas' },
  { label: 'Accesorios',      href: '/productos?cat=Accesorios' },
  { label: 'Electrodomésticos', href: '/productos?cat=Electrodomesticos' },
  { label: 'Computadoras',    href: '/productos?cat=Computadoras' },
  { label: 'Audio & Video',   href: '/productos?cat=Audio' },
];

// ── Componente ─────────────────────────────────────────────────────────────
export default function TiendaBarquisimetoPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="pb-12 w-full max-w-full space-y-8 sm:space-y-10">

        {/* ── Hero local ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl bg-navy text-white px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#FFD700]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <nav
            className="flex items-center gap-2 text-[11px] text-white/50 mb-6"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-brand-yellow transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white/80">Tienda Barquisimeto</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6C200]/50 bg-[#FFD700]/10 px-3 py-1 text-[11px] font-semibold text-[#FFD700] mb-4">
            <MapPin size={11} />
            Barquisimeto · Estado Lara · Venezuela
          </span>

          <h1 className="text-[2rem] sm:text-4xl md:text-[3rem] font-bold tracking-tight leading-[1.1] text-balance max-w-2xl">
            Mundo Tech —{' '}
            <span className="text-[#FFD700]">Conectados Contigo</span>
          </h1>

          <p className="mt-4 text-[15px] sm:text-base text-white/75 max-w-xl leading-relaxed">
            Somos tu tienda de tecnología de confianza en el centro de Barquisimeto.
            Electrónica, smartphones, consolas gaming, accesorios y electrodomésticos con{' '}
            <strong className="text-white">garantía oficial</strong> y precios en USD y Bs.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-[#FFD700] text-navy text-sm font-black border border-[#E6C200] hover:bg-[#FFE03A] transition-colors shadow-md"
            >
              Ver catálogo <ArrowRight size={16} />
            </Link>
            <a
              href="https://maps.app.goo.gl/GcDJWF54nFUseByNA"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl border border-white/25 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              <Navigation size={15} /> Cómo llegar
            </a>
          </div>
        </section>

        {/* ── Info + mapa ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Info de contacto */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 sm:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-navy tracking-tight">
              Encuéntranos en Barquisimeto
            </h2>

            <address className="not-italic space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#FFD700] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-navy">Dirección</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Carrera 21 con esquina Calle 21, Centro<br />
                    Barquisimeto, Estado Lara — Venezuela
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={18} className="text-[#FFD700] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-navy">Teléfonos</p>
                  <a
                    href="tel:+584121471338"
                    className="text-sm text-slate-600 hover:text-navy transition-colors block"
                  >
                    0412-147-1338
                  </a>
                  <a
                    href="tel:+584145051662"
                    className="text-sm text-slate-600 hover:text-navy transition-colors block mt-0.5"
                  >
                    0414-505-1662
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={18} className="text-[#FFD700] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-navy">Correo</p>
                  <a
                    href="mailto:ventas@mundotech.com.ve"
                    className="text-sm text-slate-600 hover:text-navy transition-colors"
                  >
                    ventas@mundotech.com.ve
                  </a>
                </div>
              </div>
            </address>

            {/* Horario */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-[#FFD700]" />
                <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
                  Horario de atención
                </h3>
              </div>
              <ul className="space-y-2">
                {HOURS.map(({ day, hours }) => (
                  <li key={day} className="flex justify-between text-sm">
                    <span className="text-slate-600">{day}</span>
                    <span className={`font-semibold ${hours === 'Cerrado' ? 'text-slate-400' : 'text-navy'}`}>
                      {hours}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Métodos de pago */}
            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-bold text-navy uppercase tracking-wide mb-3">
                Métodos de pago aceptados
              </p>
              <div className="flex flex-wrap gap-2">
                {['Efectivo USD/Bs.', 'Transferencia', 'Pago Móvil', 'Binance Pay', 'Zelle'].map((m) => (
                  <span
                    key={m}
                    className="bg-slate-100 text-navy text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Mapa embebido */}
          <section className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-soft min-h-[360px] lg:min-h-0">
            <iframe
              title="Ubicación Mundo Tech en Barquisimeto"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3928.0!2d-69.31205!3d10.06829!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDA0JzA2LjAiTiA2OcKwMTgnNDMuNCJX!5e0!3m2!1ses!2sve!4v1"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '360px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </section>
        </div>

        {/* ── Garantías / Trust strip ─────────────────────────────────────── */}
        <section aria-labelledby="trust-heading">
          <h2
            id="trust-heading"
            className="text-xl sm:text-2xl font-bold text-navy tracking-tight mb-5"
          >
            ¿Por qué comprar en Mundo Tech?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFF8D1] border border-[#E6C200]/40 flex items-center justify-center text-[#9a7b00]">
                  <Icon size={18} />
                </div>
                <p className="text-sm font-bold text-navy">{title}</p>
                <p className="text-[13px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Categorías disponibles ─────────────────────────────────────── */}
        <section aria-labelledby="categories-heading">
          <h2
            id="categories-heading"
            className="text-xl sm:text-2xl font-bold text-navy tracking-tight mb-2"
          >
            Lo que encontrarás en nuestra tienda
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Explora nuestro catálogo completo de productos tecnológicos disponibles en Barquisimeto.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center justify-between bg-white rounded-xl border border-slate-200/80 shadow-soft px-4 py-3.5 text-sm font-semibold text-navy hover:border-[#E6C200] hover:bg-[#FFFBEA] transition-all"
              >
                {label}
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-[#9a7b00] transition-colors"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* ── FAQ local ─────────────────────────────────────────────────── */}
        <section aria-labelledby="faq-heading" className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 sm:p-8">
          <h2
            id="faq-heading"
            className="text-xl sm:text-2xl font-bold text-navy tracking-tight mb-6"
          >
            Preguntas frecuentes sobre nuestra tienda en Barquisimeto
          </h2>
          <div className="space-y-5">
            {[
              {
                q: '¿Dónde está ubicado Mundo Tech en Barquisimeto?',
                a: 'Estamos en Carrera 21 con esquina Calle 21, en el centro de Barquisimeto, Estado Lara. Fácil acceso en transporte público y estacionamiento cercano.',
              },
              {
                q: '¿En qué moneda manejan los precios?',
                a: 'Manejamos precios en dólares (USD) y bolívares (Bs.) a tasa del día. Aceptamos efectivo en ambas monedas, transferencias bancarias, pago móvil, Zelle y Binance Pay.',
              },
              {
                q: '¿Ofrecen garantía en sus productos?',
                a: 'Sí. Todos nuestros productos son 100 % originales con garantía oficial de fábrica. Además, ofrecemos hasta 7 días de cambio si el producto llega con defecto.',
              },
              {
                q: '¿Hacen envíos fuera de Barquisimeto?',
                a: 'Hacemos envíos a todo Venezuela a través de encomiendas confiables. El tiempo de entrega es de 24 a 48 horas hábiles según el estado.',
              },
              {
                q: '¿Puedo ver y probar los productos antes de comprar?',
                a: 'Por supuesto. Visítanos en nuestra tienda física en el centro de Barquisimeto de lunes a viernes de 8 AM a 6 PM y sábados de 9 AM a 2 PM.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-slate-100 last:border-0 pb-5 last:pb-0">
                <h3 className="text-sm font-bold text-navy mb-1.5">{q}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA final ─────────────────────────────────────────────────── */}
        <section className="bg-navy rounded-2xl px-6 py-10 sm:px-10 sm:py-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            ¿Listo para visitar Mundo Tech?
          </h2>
          <p className="text-white/70 text-sm max-w-md mx-auto mb-6">
            Encuéntranos en el corazón de Barquisimeto. Te esperamos con el mejor catálogo
            de tecnología del Estado Lara.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://maps.app.goo.gl/GcDJWF54nFUseByNA"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-[#FFD700] text-navy text-sm font-black border border-[#E6C200] hover:bg-[#FFE03A] transition-colors shadow-md"
            >
              <Navigation size={15} /> Ver en Google Maps
            </a>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl border border-white/25 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              Ver catálogo online <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
