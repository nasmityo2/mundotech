'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Product } from './ProductContext';

const STORAGE_KEY = 'wishlist';

/**
 * PRD-100: tope de ítems persistidos en localStorage. Al superarlo se descarta
 * el más antiguo — evita crecer sin límite hasta agotar la cuota del navegador.
 */
const MAX_WISHLIST_ITEMS = 100;

interface WishlistContextType {
  wishlist: Product[];
  isWishlistLoading: boolean;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status: sessionStatus } = useSession();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(true);

  /** Última sesión vista — para detectar logout real (PRD-262). */
  const prevUserIdRef = useRef<string | null>(null);

  // Hidratación desde localStorage (solo en cliente)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    } catch {
      setWishlist([]);
    } finally {
      setIsWishlistLoading(false);
    }
  }, []);

  /*
   * PRD-262: al cerrar sesión en un dispositivo compartido, la wishlist del
   * cliente anterior no debe quedar visible para el siguiente. Solo se limpia
   * en el logout real — al visitante anónimo no se le toca su lista.
   */
  useEffect(() => {
    if (sessionStatus === 'loading' || isWishlistLoading) return;

    const userId = session?.user?.id ?? null;
    if (!userId) {
      if (prevUserIdRef.current) {
        prevUserIdRef.current = null;
        setWishlist([]);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* Safari modo privado */
        }
      }
      return;
    }
    prevUserIdRef.current = userId;
  }, [session?.user?.id, sessionStatus, isWishlistLoading]);

  // Persistencia: guardar cada vez que cambia wishlist (después de hidratar)
  useEffect(() => {
    if (isWishlistLoading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      /* Safari modo privado / cuota excedida */
    }
  }, [wishlist, isWishlistLoading]);

  const addToWishlist = (product: Product) => {
    setWishlist(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      const next = [...prev, product];
      return next.length > MAX_WISHLIST_ITEMS
        ? next.slice(next.length - MAX_WISHLIST_ITEMS)
        : next;
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(p => p.id !== productId));
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(p => p.id === productId);
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  const value = useMemo(() => ({
    wishlist,
    isWishlistLoading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wishlist, isWishlistLoading]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};