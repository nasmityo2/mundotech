'use client';

import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import CartDrawer from "../components/CartDrawer";

/**
 * Shell mínimo del cliente: solo gestiona la apertura del carrito
 * y renderiza Navbar + CartDrawer.
 * Footer y <main> se renderizan en layout.tsx como RSC para reducir
 * el bundle JS cliente y mejorar LCP/INP.
 */
export default function AppContent() {
  const { openCart } = useCart();

  return (
    <>
      <Navbar onCartClick={openCart} />
      <CartDrawer />
    </>
  );
}
