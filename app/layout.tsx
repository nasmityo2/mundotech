import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { ProductProvider } from "../context/ProductContext";
import { ExchangeRateProvider } from "../context/ExchangeRateContext";
import AppContent from "./AppContent";
import { Toaster } from "@/components/ui/Toaster";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0B1220",
};

export const metadata: Metadata = {
  title: { default: "MundoTech", template: "%s — MundoTech" },
  description: "Tecnología, electrodomésticos y envío seguro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className="bg-surface-sunken text-navy antialiased nums" suppressHydrationWarning>
        <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <ProductProvider>
                  <ExchangeRateProvider>
                    <AppContent>{children}</AppContent>
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
