'use client';

import { usePathname } from 'next/navigation';
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import CartDrawer from "../components/CartDrawer";

/**
 * Shell mínimo del cliente: solo gestiona la apertura del carrito
 * y renderiza Navbar + CartDrawer en rutas públicas.
 * En /admin/* ocultamos navbar y carrito (el admin usa su propio shell).
 */
export default function AppContent() {
  const { openCart } = useCart();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) return null;

  return (
    <>
      <Navbar onCartClick={openCart} />
      <CartDrawer />
    </>
  );
}
