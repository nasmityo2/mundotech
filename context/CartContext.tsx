'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { Product } from './ProductContext';
import type { CartItemAPI } from '@/lib/definitions';

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

/** Convierte un CartItemAPI (respuesta de BD) al shape CartItem que usa el contexto. */
function apiItemToCartItem(item: CartItemAPI): CartItem {
  return {
    id: item.productId,
    slug: item.slug,
    name: item.name,
    description: '',
    price: item.price,
    originalPrice: item.originalPrice,
    stock: item.stock,
    category: item.category,
    brand: item.brand,
    image: item.images[0] ?? '/placeholder.png',
    images: item.images,
    details: {},
    quantity: item.quantity,
  };
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const { data: session, status: sessionStatus } = useSession();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [itemAdded, setItemAdded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  /**
   * hasMergedRef: se activa al completar el merge al login para no repetirlo.
   * Se resetea al cerrar sesión.
   */
  const hasMergedRef = useRef(false);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── 1. Carga inicial desde localStorage ───────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cart');
      if (stored) setCart(JSON.parse(stored));
    } catch {
      setCart([]);
    } finally {
      setIsCartLoading(false);
    }
  }, []);

  // ── 2. Persistencia en localStorage (siempre, como respaldo) ──────────────
  useEffect(() => {
    if (isCartLoading) return;
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch {
      // Safari modo privado / cuota agotada
    }
  }, [cart, isCartLoading]);

  // ── 3. Merge al detectar sesión activa ────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (isCartLoading) return; // esperar a que se cargue localStorage primero

    const userId = session?.user?.id ?? null;

    if (!userId) {
      // El usuario cerró sesión: reiniciar flag para el próximo login
      hasMergedRef.current = false;
      return;
    }

    if (hasMergedRef.current) return; // ya se hizo el merge en esta sesión
    hasMergedRef.current = true;

    // Capturar ítems locales para fusionar con BD
    const localItems = cart.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    }));

    setIsCartLoading(true);
    fetch('/api/cart/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: localItems }),
    })
      .then((r) => r.json())
      .then((data: { items?: CartItemAPI[] }) => {
        if (Array.isArray(data.items)) {
          setCart(data.items.map(apiItemToCartItem));
        }
      })
      .catch((err) => console.error('[CartContext] Error en merge con BD:', err))
      .finally(() => setIsCartLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, sessionStatus, isCartLoading]);

  // ── Helpers de sync con BD (fire-and-forget) ─────────────────────────────

  const dbUpsertItem = (productId: string, quantity: number) => {
    if (!session?.user?.id) return;
    fetch('/api/cart/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
    }).catch((err) => console.error('[CartContext] Error sync upsert:', err));
  };

  const dbRemoveItem = (productId: string) => {
    if (!session?.user?.id) return;
    fetch(`/api/cart/items/${productId}`, {
      method: 'DELETE',
    }).catch((err) => console.error('[CartContext] Error sync remove:', err));
  };

  const dbClearCart = () => {
    if (!session?.user?.id) return;
    fetch('/api/cart', {
      method: 'DELETE',
    }).catch((err) => console.error('[CartContext] Error sync clear:', err));
  };

  // ── Operaciones del carrito (UI optimista + sync BD) ──────────────────────

  const addToCart = (product: Product, quantity: number = 1) => {
    // Calcular nueva cantidad con el snapshot actual (para el sync)
    const existing = cart.find((i) => i.id === product.id);
    const newQty = existing
      ? existing.quantity + quantity
      : Math.min(quantity, product.stock);

    const isValid = existing
      ? newQty <= product.stock
      : newQty > 0;

    setCart((prevItems) => {
      const prev = prevItems.find((i) => i.id === product.id);
      if (prev) {
        const q = prev.quantity + quantity;
        if (q > product.stock) return prevItems;
        return prevItems.map((i) => (i.id === product.id ? { ...i, quantity: q } : i));
      }
      const q = Math.min(quantity, product.stock);
      if (q <= 0) return prevItems;
      return [...prevItems, { ...product, quantity: q }];
    });

    if (isValid) dbUpsertItem(product.id, newQty);

    setItemAdded(true);
    setTimeout(() => setItemAdded(false), 500);
    openCart();
  };

  const silentAddToCart = (product: Product, quantity: number = 1) => {
    const existing = cart.find((i) => i.id === product.id);
    const newQty = existing
      ? existing.quantity + quantity
      : Math.min(quantity, product.stock);
    const isValid = existing ? newQty <= product.stock : newQty > 0;

    setCart((prevItems) => {
      const prev = prevItems.find((i) => i.id === product.id);
      if (prev) {
        const q = prev.quantity + quantity;
        if (q > product.stock) return prevItems;
        return prevItems.map((i) => (i.id === product.id ? { ...i, quantity: q } : i));
      }
      const q = Math.min(quantity, product.stock);
      if (q <= 0) return prevItems;
      return [...prevItems, { ...product, quantity: q }];
    });

    if (isValid) dbUpsertItem(product.id, newQty);
  };

  const removeFromCart = (productId: string) => {
    const itemToRemove = cart.find((i) => i.id === productId);
    setCart((prevItems) => prevItems.filter((i) => i.id !== productId));
    dbRemoveItem(productId);
    if (itemToRemove) {
      showNotification(`"${itemToRemove.name}" eliminado.`, 'success');
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevItems) =>
      prevItems.map((i) =>
        i.id === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i,
      ),
    );
    const item = cart.find((i) => i.id === productId);
    const capped = item ? Math.min(quantity, item.stock) : quantity;
    dbUpsertItem(productId, capped);
  };

  const clearCart = () => {
    setCart([]);
    dbClearCart();
  };

  const getCartTotal = () =>
    cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

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
