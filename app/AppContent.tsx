'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { APP_CHUNK_RELOAD_KEY, clearChunkReloadFlag } from '@/lib/chunk-load-error';
import { useCart } from "../context/CartContext";
import Navbar, { type NavbarContact } from "../components/Navbar";
import CartDrawer from "../components/CartDrawer";

/**
 * Shell mínimo del cliente: solo gestiona la apertura del carrito
 * y renderiza Navbar + CartDrawer en rutas públicas.
 * En /admin/* ocultamos navbar y carrito (el admin usa su propio shell).
 * Los datos de contacto llegan del servidor (readSettings) — regla R1:
 * nada de teléfonos ni emails hardcodeados en componentes de UI.
 */
export default function AppContent({ contact }: { contact: NavbarContact }) {
  const { openCart } = useCart();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  useEffect(() => {
    if (isAdmin) return;
    const id = requestAnimationFrame(() => {
      if (!document.querySelector('[data-app-error]')) {
        clearChunkReloadFlag(APP_CHUNK_RELOAD_KEY);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isAdmin, pathname]);

  if (isAdmin) return null;

  return (
    <>
      <Navbar onCartClick={openCart} contact={contact} />
      <CartDrawer />
    </>
  );
}
