'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Product } from './ProductContext';

const STORAGE_KEY = 'wishlist';

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
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(true);

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
      return [...prev, product];
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