'use client';

import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { openCart } = useCart();

  return (
    <div className="flex min-h-[100dvh] flex-col w-full max-w-full overflow-x-hidden">
      <Navbar onCartClick={openCart} />
      <CartDrawer />
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <div className="container mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
