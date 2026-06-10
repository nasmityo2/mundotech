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
import { Toaster } from "@/components/ui/Toaster";
import { readSeoLocal, buildLocalBusinessSchema } from "@/lib/seo-local";
import { readSettings } from "@/lib/data-store";
import { readAnnouncement } from "@/lib/announcement";
import { readSiteContent } from "@/lib/site-content";
import { googleMapsBusinessUrl } from "@/lib/google-maps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mundotech.com.ve";

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
  title: {
    default: "MundoTech — Tecnología en Barquisimeto, Venezuela",
    template: "%s — MundoTech",
  },
  description:
    "Tecnología y gadgets en Barquisimeto. Precios USD/Bs., garantía oficial y envío seguro a toda Venezuela.",
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
  alternates: { canonical: SITE_URL },
  // La imagen og:image / twitter:image la inyecta automáticamente
  // app/opengraph-image.tsx (generada con la marca; el antiguo
  // /og-default.jpg no existía y rompía las previews sociales).
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: SITE_URL,
    siteName: "MundoTech",
    title: "MundoTech — Tecnología en Barquisimeto, Venezuela",
    description:
      "Tecnología y gadgets en Barquisimeto. USD/Bs., garantía oficial y envío seguro.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MundoTech — Tecnología en Barquisimeto, Venezuela",
    description:
      "Tecnología y gadgets en Barquisimeto. Garantía oficial y envío seguro.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

// ── Schemas globales: WebSite + LocalBusiness ───────────────────────────────
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MundoTech",
  url: SITE_URL,
  description:
    "Tecnología y gadgets en Barquisimeto, Lara — Venezuela.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/productos?q={search_term_string}`,
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

  const localBusinessSchema = buildLocalBusinessSchema(seo, {
    siteUrl: SITE_URL,
    storeName: settings.storeName,
    email: settings.email,
    phone: settings.phone,
    description:
      "Tecnología y gadgets en Lara y Barquisimeto. Envíos nacionales, USD/Bs., garantía oficial.",
    sameAs,
  });

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
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
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
