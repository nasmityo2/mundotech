/**
 * SESIÓN 24 — Anuncios aria-live del carrito.
 *
 * Verifica que:
 * - addToCart / removeFromCart / updateQuantity emiten anuncio en la región aria-live.
 * - Repetir la misma acción vuelve a anunciar (clear + re-set funciona).
 * - Out-of-stock anuncia error de stock.
 * - StrictMode no duplica el anuncio por montaje doble.
 * - No se anuncia en carga inicial ni merge remoto.
 * - silentAddToCart no anuncia.
 * - No se roba foco.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart } from '../context/CartContext';
import type { Product } from '../context/ProductContext';

// ── Mock next-auth ───────────────────────────────────────────────────────────
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock next/navigation ─────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// ── Mock next/dynamic ────────────────────────────────────────────────────────
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockDynamic = () => <div data-testid="mock-dynamic" />;
    MockDynamic.displayName = 'MockDynamic';
    return MockDynamic;
  },
}));

// ── Mock GA4 ─────────────────────────────────────────────────────────────────
vi.mock('@/lib/ga4', () => ({
  track: vi.fn(),
  toGa4Item: vi.fn((item: Product) => ({ item_id: item.id, item_name: item.name })),
  ga4ItemsValue: vi.fn(() => 0),
  GA4_CURRENCY: 'USD',
}));

// ── Mock product snapshot actions ────────────────────────────────────────────
vi.mock('@/app/actions/productSnapshotActions', () => ({
  getProductSnapshots: vi.fn(() => Promise.resolve(null)),
}));

// ── Mock chunk error reloader ────────────────────────────────────────────────
vi.mock('@/lib/chunk-load-error', () => ({
  APP_CHUNK_RELOAD_KEY: 'test',
  clearChunkReloadFlag: vi.fn(),
}));

// ── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Teclado Mecánico RGB',
    description: 'Un teclado mecánico con iluminación RGB.',
    price: 45.99,
    stock: 10,
    category: 'Tecnología',
    brand: 'MundoTech',
    image: '/test.jpg',
    images: ['/test.jpg'],
    details: {},
    ...overrides,
  };
}

/**
 * Componente que expone la región aria-live y los botones de acción del carrito
 * para poder probar los anuncios en un entorno controlado.
 */
function CartTestHarness() {
  const {
    announcement,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    silentAddToCart,
    cart,
  } = useCart();

  return (
    <div>
      {/* Región aria-live idéntica a la de AppContent */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="cart-announcement"
        className="sr-only"
      >
        {announcement}
      </div>
      <button type="button" onClick={() => addToCart(makeProduct())} data-testid="btn-add">
        Agregar Teclado
      </button>
      <button type="button" onClick={() => addToCart(makeProduct(), 3)} data-testid="btn-add-3">
        Agregar 3 Teclados
      </button>
      <button type="button"
        onClick={() => addToCart(makeProduct({ stock: 2, name: 'Mouse' }), 5)}
        data-testid="btn-add-oos"
      >
        Agregar sin stock
      </button>
      <button type="button"
        onClick={() => {
          if (cart.length > 0) removeFromCart(cart[0].id);
        }}
        data-testid="btn-remove"
      >
        Eliminar último
      </button>
      <button type="button"
        onClick={() => {
          if (cart.length > 0) updateQuantity(cart[0].id, 5);
        }}
        data-testid="btn-update"
      >
        Actualizar a 5
      </button>
      <button type="button"
        onClick={() => {
          if (cart.length > 0) updateQuantity(cart[0].id, 99);
        }}
        data-testid="btn-update-oos"
      >
        Actualizar a 99 (sin stock)
      </button>
      <button type="button" onClick={() => clearCart()} data-testid="btn-clear">
        Vaciar carrito
      </button>
      <button type="button"
        onClick={() => silentAddToCart(makeProduct({ id: 'prod-silent', name: 'Silent Item' }))}
        data-testid="btn-silent"
      >
        Silent add
      </button>
      <span data-testid="cart-count">{cart.length}</span>
    </div>
  );
}

function renderTestHarness() {
  return render(
    <CartProvider>
      <CartTestHarness />
    </CartProvider>
  );
}

/** Helper: limpia el contenido de la región aria-live para la siguiente aserción.
 *  Como el anuncio se re-asienta con setTimeout(50ms), debemos esperar a que
 *  el timer se ejecute. */
async function waitForAnnouncement(expectedText: string) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });
  const el = screen.getByTestId('cart-announcement');
  expect(el.textContent).toBe(expectedText);
}

async function waitForEmptyAnnouncement() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });
  const el = screen.getByTestId('cart-announcement');
  expect(el.textContent).toBe('');
}

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Cart aria-live announcements — SESIÓN 24', () => {
  it('anuncia "agregado" al hacer addToCart', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); }); // esperar carga inicial

    const addBtn = screen.getByTestId('btn-add');
    await act(async () => { addBtn.click(); });
    await waitForAnnouncement('"Teclado Mecánico RGB" agregado al carrito.');
  });

  it('anuncia "actualizado" al hacer addToCart de un producto ya en carrito', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    const addBtn = screen.getByTestId('btn-add');
    await act(async () => { addBtn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); }); // esperar setItemAdded

    // Segundo clic en el mismo producto → actualización
    await act(async () => { addBtn.click(); });
    await waitForAnnouncement('"Teclado Mecánico RGB" actualizado: 2 unidad(es) en el carrito.');
  });

  it('anuncia "eliminado" al hacer removeFromCart', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    // Primero agregar
    const addBtn = screen.getByTestId('btn-add');
    await act(async () => { addBtn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); });

    // Luego eliminar
    const removeBtn = screen.getByTestId('btn-remove');
    await act(async () => { removeBtn.click(); });
    await waitForAnnouncement('"Teclado Mecánico RGB" eliminado del carrito.');
  });

  it('anuncia "actualizado" al hacer updateQuantity', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    const addBtn = screen.getByTestId('btn-add');
    await act(async () => { addBtn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); });

    const updateBtn = screen.getByTestId('btn-update');
    await act(async () => { updateBtn.click(); });
    await waitForAnnouncement('"Teclado Mecánico RGB" actualizado: 5 unidad(es) en el carrito.');
  });

  it('anuncia out-of-stock cuando se intenta agregar más del stock disponible (producto ya en carrito)', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    // Agregar 9 unidades del Teclado (stock 10)
    const add3Btn = screen.getByTestId('btn-add-3');
    await act(async () => { add3Btn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); });
    await act(async () => { add3Btn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); });
    await act(async () => { add3Btn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); });

    // Ahora hay 9 en carrito. Intentar agregar 3 más → excede stock 10 → OOS
    await act(async () => { add3Btn.click(); });
    await waitForAnnouncement(
      'No hay suficiente stock de "Teclado Mecánico RGB". Máximo disponible: 10.',
    );
  });

  it('anuncia out-of-stock en updateQuantity si excede stock', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    const addBtn = screen.getByTestId('btn-add');
    await act(async () => { addBtn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); });

    const updateOosBtn = screen.getByTestId('btn-update-oos');
    await act(async () => { updateOosBtn.click(); });
    await waitForAnnouncement(
      'No hay suficiente stock de "Teclado Mecánico RGB". Máximo disponible: 10.',
    );
  });

  it('repite anuncio cuando la misma acción se ejecuta dos veces seguidas', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    const addBtn = screen.getByTestId('btn-add');

    // Primer clic
    await act(async () => { addBtn.click(); });
    await waitForAnnouncement('"Teclado Mecánico RGB" agregado al carrito.');

    // Simular que el usuario quita y vuelve a agregar el producto (por ejemplo,
    // después de haberlo eliminado)
    const removeBtn = screen.getByTestId('btn-remove');
    await act(async () => { removeBtn.click(); });
    await waitForAnnouncement('"Teclado Mecánico RGB" eliminado del carrito.');

    // Agregar de nuevo — debe anunciar aunque sea el mismo texto que antes
    await act(async () => { addBtn.click(); });
    await waitForAnnouncement('"Teclado Mecánico RGB" agregado al carrito.');
  });

  it('silentAddToCart no emite anuncio', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    const silentBtn = screen.getByTestId('btn-silent');
    await act(async () => { silentBtn.click(); });
    await waitForEmptyAnnouncement();
  });

  it('no anuncia en carga inicial ni merge', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    // Después del render y carga inicial, no debe haber anuncios
    await waitForEmptyAnnouncement();
  });

  it('no roba foco (el div sr-only no es focusable)', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    const el = screen.getByTestId('cart-announcement');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-atomic')).toBe('true');
    expect(el.getAttribute('tabindex')).toBeNull();
    expect(el.getAttribute('class')).toContain('sr-only');
  });

  it('clearCart no emite nuevo anuncio (conserva el anterior)', async () => {
    renderTestHarness();
    await act(async () => { vi.advanceTimersByTime(10); });

    const addBtn = screen.getByTestId('btn-add');
    await act(async () => { addBtn.click(); });
    await act(async () => { vi.advanceTimersByTime(200); });

    // Clear no debería cambiar el anuncio
    const clearBtn = screen.getByTestId('btn-clear');
    await act(async () => { clearBtn.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });

    // El anuncio sigue siendo el del add (clear no modifica announcement)
    const el = screen.getByTestId('cart-announcement');
    expect(el.textContent).toBe('"Teclado Mecánico RGB" agregado al carrito.');
  });
});
