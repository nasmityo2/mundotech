import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { ProductProvider } from "../context/ProductContext";
import { ExchangeRateProvider } from "../context/ExchangeRateContext";
import AppContent from "./AppContent";
import Footer from "./components/Footer";
import AppLayoutShell from "./components/AppLayoutShell";
import AnnouncementBar from "./components/AnnouncementBar";
import WhatsAppFab from "./components/WhatsAppFab";
import PromoPopup from "./components/PromoPopup";
import CookieConsent from "./components/CookieConsent";
import JsonLd from "./components/JsonLd";
import { Toaster } from "@/components/ui/Toaster";
import { readSeoLocal, buildLocalBusinessSchema } from "@/lib/seo-local";
import { readSettings } from "@/lib/data-store";
import { readAnnouncement } from "@/lib/announcement";
import { readSiteContent } from "@/lib/site-content";
import { googleMapsBusinessUrl } from "@/lib/google-maps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mundotechve.com";

// Jost es la tipografía de marca declarada en el sistema de diseño; antes se
// referenciaba en CSS sin cargarse nunca (el sitio caía a Arial en silencio).
const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0B1220",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // H02 (P08): las páginas que ya llevan marca usan `title.absolute`;
  // el resto hereda el sufijo "| MundoTech" una sola vez vía template.
  title: {
    default: "MundoTech | Tecnología en Barquisimeto, Venezuela",
    template: "%s | MundoTech",
  },
  description:
    "Tienda de tecnología en Barquisimeto: gadgets, consolas, audio y accesorios con garantía real. Precios en USD y Bs, retiro en tienda y envíos a toda Venezuela.",
  keywords: [
    "tecnología Barquisimeto",
    "tienda tecnología Venezuela",
    "gadgets tecnología Venezuela",
    "productos trending Barquisimeto",
    "MundoTech",
    "consolas Venezuela",
    "accesorios tech Lara",
    "computadoras Barquisimeto",
  ],
  authors: [{ name: "MundoTech", url: SITE_URL }],
  creator: "MundoTech",
  publisher: "MundoTech",
  // H03: sin canonical global — cada página indexable declara el suyo.
  // Heredar el canonical de la raíz hacía que /cart, /login, /account, etc.
  // apuntaran a la home como URL canónica (consolidación errónea de señales).
  // La imagen og:image / twitter:image la inyecta automáticamente
  // app/opengraph-image.tsx (generada con la marca; el antiguo
  // /og-default.jpg no existía y rompía las previews sociales).
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: SITE_URL,
    siteName: "MundoTech",
    title: "MundoTech | Tecnología en Barquisimeto, Venezuela",
    description:
      "Tecnología y gadgets en Barquisimeto. USD/Bs., garantía real y envíos a toda Venezuela.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MundoTech | Tecnología en Barquisimeto, Venezuela",
    description:
      "Tecnología y gadgets en Barquisimeto. Garantía real y envíos a toda Venezuela.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  // H24: solo emitir el meta de verificación cuando la env var existe
  // (un content="" vacío no verifica Search Console y ensucia el head).
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

// ── Schemas globales: WebSite + LocalBusiness ───────────────────────────────
// @id estables (P78/H54): permiten que Google consolide WebSite ↔ Organization
// ↔ LocalBusiness ↔ Product (seller) como una sola entidad de marca.
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "MundoTech",
  url: SITE_URL,
  inLanguage: "es-VE",
  description:
    "Tecnología y gadgets en Barquisimeto, Lara — Venezuela.",
  publisher: { "@id": `${SITE_URL}/#organization` },
  // H08 (P64): el SearchAction apunta a la búsqueda real del sitio (/buscar),
  // la misma que usan SearchBar y SearchMobileOverlay.
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Datos vivos editables desde /admin/settings/seo-local, /admin/settings
  // y /admin/personalizar.
  const [seo, settings, announcement, siteContent, headersList] = await Promise.all([
    readSeoLocal(),
    readSettings(),
    readAnnouncement(),
    readSiteContent(),
    headers(),
  ]);
  // Nonce generado por middleware para CSP strict-dynamic (sin unsafe-inline en script-src).
  const nonce = headersList.get('x-nonce') ?? undefined;
  const sameAs = [settings.instagram, settings.facebook].filter(Boolean) as string[];

  const localBusinessSchema = {
    ...buildLocalBusinessSchema(seo, {
      siteUrl: SITE_URL,
      storeName: settings.storeName,
      email: settings.email,
      phone: settings.phone,
      description:
        "Tecnología y gadgets en Lara y Barquisimeto. Envíos nacionales, USD/Bs., garantía oficial.",
      sameAs,
    }),
    // H29/P24: mismo @id en todas las páginas — una sola entidad local.
    "@id": `${SITE_URL}/#localbusiness`,
  };

  // Si el admin no llenó el URL del mapa, usamos el helper con la dirección viva.
  if (!localBusinessSchema.hasMap) {
    localBusinessSchema.hasMap = googleMapsBusinessUrl(
      `${seo.legalName}, ${seo.streetAddress}, ${seo.addressLocality}, ${seo.addressRegion}, Venezuela`,
    );
  }

  // Organization: potencia la entidad de marca, el logo y el panel de conocimiento.
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: settings.storeName,
    url: SITE_URL,
    logo: `${SITE_URL}/opengraph-image`,
    image: `${SITE_URL}/opengraph-image`,
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.phone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            telephone: settings.phone,
            contactType: "customer service",
            areaServed: "VE",
            availableLanguage: ["es"],
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <html lang="es" data-scroll-behavior="smooth" className={jost.variable}>
      <body className="bg-surface-sunken text-navy antialiased nums" suppressHydrationWarning>
        {/* PRD-289: descriptor OpenSearch (React hoistea este link al <head>). */}
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title="MundoTech"
          href="/opensearch.xml"
        />
        {/* PRD-055: skip link — primer elemento enfocable de la página. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-navy focus:text-white focus:px-4 focus:py-2.5 focus:rounded-xl focus:text-sm focus:font-semibold focus:shadow-lift"
        >
          Saltar al contenido
        </a>
        <JsonLd data={[websiteSchema, localBusinessSchema, organizationSchema]} nonce={nonce} />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <ProductProvider>
                <ExchangeRateProvider>
                  {/*
                    Shell del layout: Navbar/CartDrawer en cliente (AppContent),
                    <main> y <Footer> en servidor para reducir JS bundle
                    y mejorar LCP / INP (Core Web Vitals).
                  */}
                  <div className="flex min-h-[100dvh] flex-col w-full max-w-full overflow-x-hidden">
                    <AnnouncementBar data={announcement} />
                    <AppContent
                      contact={{
                        phone: settings.phone,
                        phone2: settings.phone2,
                        email: settings.email,
                        // PRD-112: dirección viva desde settings (R1).
                        address: settings.address,
                        // PRD-285: claim logístico editable desde /admin/personalizar.
                        deliveryNote:
                          siteContent.productTrust.find((t) => t.icon === 'truck')?.title ?? '',
                      }}
                    />
                    <AppLayoutShell footer={<Footer />}>
                      {children}
                    </AppLayoutShell>
                  </div>
                  {siteContent.whatsapp.enabled ? (
                    <WhatsAppFab
                      phone={siteContent.whatsapp.phone}
                      message={siteContent.whatsapp.message}
                    />
                  ) : null}
                  <PromoPopup popup={siteContent.popup} />
                  <CookieConsent />
                </ExchangeRateProvider>
              </ProductProvider>
            </WishlistProvider>
          </CartProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
