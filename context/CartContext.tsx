'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { Product } from './ProductContext';
import type { CartItemAPI } from '@/lib/definitions';
import { getProductSnapshots } from '@/app/actions/productSnapshotActions';

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
  /** PRD-061/096: re-valida precio/stock de los ítems contra la BD. */
  refreshCart: () => Promise<void>;
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
    image: item.images[0] ?? '/placeholder-product.png',
    images: item.images,
    details: {},
    quantity: item.quantity,
  };
}

/** Milisegundos mínimos entre refresh automáticos (focus/apertura del drawer). */
const REFRESH_MIN_INTERVAL_MS = 30_000;
/** Debounce del sync de cantidades hacia la BD (PRD-097). */
const SYNC_DEBOUNCE_MS = 400;

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

  /**
   * prevUserIdRef: distingue "logout real" (había sesión y dejó de haberla)
   * de "visitante que nunca inició sesión" — al visitante no se le borra
   * su carrito local (PRD-261 / PRD-263).
   */
  const prevUserIdRef = useRef<string | null>(null);

  /** Refs para el sync debounced por producto (PRD-097: evita PATCH fuera de orden). */
  const syncTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingQtyRef = useRef<Map<string, number>>(new Map());

  /** Refs para refresh: estado vivo del carrito y throttle de refresco. */
  const cartRef = useRef<CartItem[]>(cart);
  cartRef.current = cart;
  const isAuthedRef = useRef(false);
  isAuthedRef.current = !!session?.user?.id;
  const lastRefreshRef = useRef(0);
  const refreshingRef = useRef(false);

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

      /*
       * PRD-261 / PRD-263: en un PC/tablet compartido (mostrador de la tienda)
       * el carrito del cliente anterior NO debe quedar visible para el
       * siguiente. Solo se limpia cuando hubo una sesión antes (logout real);
       * el carrito del usuario sigue guardado en BD y se restaura en su
       * próximo login vía /api/cart/merge.
       */
      if (prevUserIdRef.current) {
        prevUserIdRef.current = null;
        setCart([]);
        try {
          localStorage.removeItem('cart');
        } catch {
          /* Safari modo privado */
        }
      }
      return;
    }

    prevUserIdRef.current = userId;

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
          // PRD-096: la respuesta del merge trae precio/stock frescos de BD —
          // reemplaza el snapshot local para no arrastrar datos obsoletos.
          setCart(data.items.map(apiItemToCartItem));
          lastRefreshRef.current = Date.now();
        }
      })
      .catch((err) => console.error('[CartContext] Error en merge con BD:', err))
      .finally(() => setIsCartLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, sessionStatus, isCartLoading]);

  // ── Refresh de precio/stock (PRD-061 invitado, PRD-096/234 sesión) ────────

  const refreshCart = useCallback(async () => {
    if (refreshingRef.current) return;
    const items = cartRef.current;
    if (items.length === 0) return;
    refreshingRef.current = true;

    try {
      if (isAuthedRef.current) {
        // Con sesión, la BD es la fuente de verdad del carrito.
        const res = await fetch('/api/cart', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { items?: CartItemAPI[] };
          if (Array.isArray(data.items)) {
            setCart(data.items.map(apiItemToCartItem));
          }
        }
      } else {
        // Invitado: re-validar el snapshot de localStorage contra la BD.
        const snapshots = await getProductSnapshots(items.map((i) => i.id));
        if (snapshots) {
          const byId = new Map(snapshots.map((s) => [s.id, s]));
          setCart((prev) =>
            prev
              .filter((i) => byId.has(i.id)) // producto eliminado del catálogo
              .map((i) => {
                const s = byId.get(i.id)!;
                return {
                  ...i,
                  slug: s.slug,
                  name: s.name,
                  price: s.price,
                  originalPrice: s.originalPrice,
                  stock: s.stock,
                  image: s.images[0] ?? i.image ?? '/placeholder-product.png',
                  images: s.images,
                  quantity: Math.max(1, Math.min(i.quantity, s.stock)),
                };
              })
              .filter((i) => i.stock > 0),
          );
        }
      }
      lastRefreshRef.current = Date.now();
    } catch (err) {
      console.error('[CartContext] Error al refrescar carrito:', err);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  /** Refresh con throttle: para eventos frecuentes (focus, abrir drawer). */
  const refreshCartThrottled = useCallback(() => {
    if (Date.now() - lastRefreshRef.current < REFRESH_MIN_INTERVAL_MS) return;
    void refreshCart();
  }, [refreshCart]);

  // PRD-098: el merge ocurre una sola vez por sesión; al volver el foco a la
  // pestaña re-sincronizamos el carrito (otra pestaña/dispositivo pudo cambiarlo).
  useEffect(() => {
    const onFocus = () => refreshCartThrottled();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshCartThrottled]);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
    // PRD-234/235: stock fresco antes de que el usuario ajuste cantidades.
    refreshCartThrottled();
  }, [refreshCartThrottled]);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  // ── Helpers de sync con BD (debounced, último valor gana — PRD-097) ───────

  const dbUpsertItem = useCallback((productId: string, quantity: number) => {
    if (!isAuthedRef.current) return;
    pendingQtyRef.current.set(productId, quantity);

    const timers = syncTimersRef.current;
    const existing = timers.get(productId);
    if (existing) clearTimeout(existing);

    timers.set(
      productId,
      setTimeout(() => {
        timers.delete(productId);
        const qty = pendingQtyRef.current.get(productId);
        pendingQtyRef.current.delete(productId);
        if (qty === undefined) return;
        fetch('/api/cart/items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, quantity: qty }),
        }).catch((err) => console.error('[CartContext] Error sync upsert:', err));
      }, SYNC_DEBOUNCE_MS),
    );
  }, []);

  const cancelPendingSync = (productId: string) => {
    const timer = syncTimersRef.current.get(productId);
    if (timer) clearTimeout(timer);
    syncTimersRef.current.delete(productId);
    pendingQtyRef.current.delete(productId);
  };

  const dbRemoveItem = (productId: string) => {
    cancelPendingSync(productId);
    if (!isAuthedRef.current) return;
    fetch(`/api/cart/items/${productId}`, {
      method: 'DELETE',
    }).catch((err) => console.error('[CartContext] Error sync remove:', err));
  };

  const dbClearCart = () => {
    for (const id of [...syncTimersRef.current.keys()]) cancelPendingSync(id);
    if (!isAuthedRef.current) return;
    fetch('/api/cart', {
      method: 'DELETE',
    }).catch((err) => console.error('[CartContext] Error sync clear:', err));
  };

  // ── Operaciones del carrito (UI optimista + sync BD) ──────────────────────

  /**
   * Inserta/incrementa dentro del updater funcional: la cantidad final se
   * calcula SIEMPRE sobre el estado más reciente (PRD-097, sin snapshot stale).
   */
  const applyAdd = useCallback(
    (product: Product, quantity: number) => {
      setCart((prevItems) => {
        const prev = prevItems.find((i) => i.id === product.id);
        if (prev) {
          const q = prev.quantity + quantity;
          if (q > product.stock) return prevItems;
          dbUpsertItem(product.id, q);
          return prevItems.map((i) => (i.id === product.id ? { ...i, quantity: q } : i));
        }
        const q = Math.min(quantity, product.stock);
        if (q <= 0) return prevItems;
        dbUpsertItem(product.id, q);
        return [...prevItems, { ...product, quantity: q }];
      });
    },
    [dbUpsertItem],
  );

  const addToCart = (product: Product, quantity: number = 1) => {
    applyAdd(product, quantity);
    setItemAdded(true);
    setTimeout(() => setItemAdded(false), 500);
    openCart();
  };

  const silentAddToCart = (product: Product, quantity: number = 1) => {
    applyAdd(product, quantity);
  };

  const removeFromCart = (productId: string) => {
    const itemToRemove = cartRef.current.find((i) => i.id === productId);
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
      prevItems.map((i) => {
        if (i.id !== productId) return i;
        const capped = Math.min(quantity, i.stock);
        dbUpsertItem(productId, capped);
        return { ...i, quantity: capped };
      }),
    );
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
        refreshCart,
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
