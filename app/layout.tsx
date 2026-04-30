import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { ProductProvider } from "../context/ProductContext";
import { ExchangeRateProvider } from "../context/ExchangeRateContext";
import AppContent from "./AppContent";
import Footer from "./components/Footer";
import { Toaster } from "@/components/ui/Toaster";
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
    "Tienda de tecnología, electrónica y electrodomésticos en Barquisimeto, Venezuela. Precios en USD y Bs., garantía oficial y envío seguro a todo el país.",
  keywords: [
    "tecnología Barquisimeto",
    "tienda tecnología Venezuela",
    "electrónica Barquisimeto",
    "MundoTech",
    "electrodomésticos Venezuela",
    "consolas gaming Venezuela",
    "celulares Barquisimeto",
    "computadoras Lara",
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
      "Tienda de tecnología, electrónica y electrodomésticos en Barquisimeto. Precios en USD y Bs., garantía oficial.",
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
      "Tienda de tecnología y electrodomésticos en Barquisimeto. Garantía oficial, envío seguro.",
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
    "Tienda de tecnología y electrodomésticos en Barquisimeto, Venezuela.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/productos?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "MundoTech",
  description:
    "Líderes en tecnología en el estado Lara. Tienda de electrónica, accesorios y electrodomésticos en Barquisimeto, Venezuela. Precios en USD y Bs., garantía oficial.",
  url: SITE_URL,
  telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+58-412-1471338",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "ventas@mundotech.com.ve",
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-default.jpg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "CARRERA 21 CON ESQUINA CALLE 21 CENTRO",
    addressLocality: "Barquisimeto",
    addressRegion: "Lara",
    postalCode: "3001",
    addressCountry: "VE",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 10.068287498832946,
    longitude: -69.3120556394341,
  },
  hasMap: googleMapsBusinessUrl(),
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:30",
      closes: "17:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "08:30",
      closes: "18:00",
    },
  ],
  priceRange: "$$",
  currenciesAccepted: "USD, VES",
  paymentAccepted: "Cash, Transferencia, Pago Móvil, Binance Pay",
  areaServed: [
    { "@type": "City", name: "Barquisimeto" },
    { "@type": "State", name: "Lara" },
    { "@type": "Country", name: "Venezuela" },
  ],
  sameAs: [
    "https://www.instagram.com/mundotech39/",
    "https://www.facebook.com/p/Mundo-Tech-100090548322161/",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                    <main className="flex-1 w-full max-w-full overflow-x-hidden">
                      <div className="container mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10">
                        {children}
                      </div>
                    </main>
                    <Footer />
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
