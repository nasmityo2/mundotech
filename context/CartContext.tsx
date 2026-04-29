'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from './ProductContext';

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  isCartLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  itemAdded: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  silentAddToCart: (product: Product, quantity?: number) => void;
  notification: { message: string; type: 'success' | 'error' } | null;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [itemAdded, setItemAdded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
      setCart([]);
    } finally {
      setIsCartLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCartLoading) {
      try {
        localStorage.setItem('cart', JSON.stringify(cart));
      } catch {
        /* Safari modo privado / cuota */
      }
    }
  }, [cart, isCartLoading]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > product.stock) return prevItems;
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        const qty = Math.min(quantity, product.stock);
        if (qty <= 0) return prevItems;
        return [...prevItems, { ...product, quantity: qty }];
      }
    });
    setItemAdded(true);
    setTimeout(() => setItemAdded(false), 500);
    openCart();
  };

  const silentAddToCart = (product: Product, quantity: number = 1) => {
    setCart(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > product.stock) return prevItems;
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        const qty = Math.min(quantity, product.stock);
        if (qty <= 0) return prevItems;
        return [...prevItems, { ...product, quantity: qty }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    const itemToRemove = cart.find(item => item.id === productId);
    setCart(prevItems => prevItems.filter(item => item.id !== productId));
    if (itemToRemove) {
      showNotification(`"${itemToRemove.name}" eliminado.`, 'success');
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity: Math.min(quantity, item.stock) } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        itemAdded,
        isCartOpen,
        openCart,
        closeCart,
        silentAddToCart,
        notification,
        showNotification,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
