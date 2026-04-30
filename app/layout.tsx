import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { ProductProvider } from "../context/ProductContext";
import { ExchangeRateProvider } from "../context/ExchangeRateContext";
import AppContent from "./AppContent";
import Footer from "./components/Footer";
import AppLayoutShell from "./components/AppLayoutShell";
import { Toaster } from "@/components/ui/Toaster";
import { readSeoLocal, buildLocalBusinessSchema } from "@/lib/seo-local";
import { readSettings } from "@/lib/data-store";
import { googleMapsBusinessUrl } from "@/lib/google-maps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mundotech.com.ve";

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
    "Tecnología, gadgets e inventos con rotación rápida —mucho catálogo de origen chino— en Barquisimeto. Electrodomésticos de mesa y cocina compacta (cocinas tipo caracol, hornillas, útiles); gaming retro y electrónica. Sin celulares. USD/Bs., garantía y envío seguro.",
  keywords: [
    "tecnología Barquisimeto",
    "tienda tecnología Venezuela",
    "gadgets tecnología Venezuela",
    "productos trending Barquisimeto",
    "MundoTech",
    "electrodomésticos cocina Barquisimeto",
    "consolas gaming Venezuela",
    "compras China Barquisimeto",
    "accesorios tech Lara",
  ],
  authors: [{ name: "MundoTech", url: SITE_URL }],
  creator: "MundoTech",
  publisher: "MundoTech",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: SITE_URL,
    siteName: "MundoTech",
    title: "MundoTech — Tecnología en Barquisimeto, Venezuela",
    description:
      "Tecnología en Barquisimeto: gadgets, inventos y gaming retro. Electrodomésticos de cocina compacta de mesa. Sin celulares. USD/Bs., garantía oficial.",
    images: [
      {
        url: `${SITE_URL}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "MundoTech — Tecnología en Barquisimeto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MundoTech — Tecnología en Barquisimeto, Venezuela",
    description:
      "Tecnología, gadgets y electro para cocina de mesa en Barquisimeto. Gaming retro y accesorios. Sin celulares. Garantía oficial, envío seguro.",
    images: [`${SITE_URL}/og-default.jpg`],
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
    "Tecnología, gadgets y electro para cocina de mesa en Barquisimeto, Venezuela.",
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
  // Datos vivos editables desde /admin/settings/seo-local y /admin/settings.
  const [seo, settings] = await Promise.all([readSeoLocal(), readSettings()]);
  const sameAs = [settings.instagram, settings.facebook].filter(Boolean) as string[];

  const localBusinessSchema = buildLocalBusinessSchema(seo, {
    siteUrl: SITE_URL,
    storeName: settings.storeName,
    email: settings.email,
    phone: settings.phone,
    description:
      "Tecnología en Lara: gadgets, inventos y catálogo de rotación, consolas gaming y electrodomésticos de cocina compacta. Sin celulares. Barquisimeto.",
    sameAs,
  });

  // Si el admin no llenó el URL del mapa, usamos el helper con la dirección viva.
  if (!localBusinessSchema.hasMap) {
    localBusinessSchema.hasMap = googleMapsBusinessUrl(
      `${seo.legalName}, ${seo.streetAddress}, ${seo.addressLocality}, ${seo.addressRegion}, Venezuela`,
    );
  }

  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className="bg-surface-sunken text-navy antialiased nums" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
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
                    <AppContent />
                    <AppLayoutShell footer={<Footer />}>
                      {children}
                    </AppLayoutShell>
                  </div>
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
