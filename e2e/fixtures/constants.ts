import { test as base, type Page } from '@playwright/test';

/**
 * Fixtures E2E deterministas para MundoTech.
 *
 * Datos generados por scripts/e2e-reset-db.ts.
 */

// ── Identificadores deterministas ──
export const E2E_ADMIN = {
  email: 'admin@mundotechtest.com',
  password: 'admin-e2e-pass',
  name: 'Admin Test',
} as const;

export const E2E_CLIENT = {
  email: 'cliente@mundotechtest.com',
  password: 'cliente-e2e-pass',
  name: 'Cliente Test',
} as const;

export const E2E_PRODUCTS = {
  inStock: {
    name: 'Audífonos Bluetooth Test',
    slug: 'audifonos-bluetooth-test',
    price: 45.99,
    stock: 10,
    category: 'Electrónicos',
  },
  noStock: {
    name: 'Cargador USB-C Test',
    slug: 'cargador-usb-c-test',
    price: 15.50,
    stock: 0,
    category: 'Accesorios',
  },
} as const;

export const E2E_COUPON = {
  code: 'E2E10',
  discountPercent: 10,
  minPurchase: 20,
  maxDiscount: 10,
} as const;

// ── Test fixture extendido ──

/**
 * Realiza login con el form de credenciales (email + password).
 * Asume que la página está en /login o que el form está visible.
 */
export async function doLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  // Esperar a que el formulario esté listo
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Esperar a que redirija al home (o dashboard según rol)
  await page.waitForURL(/^\/($|admin)/, { timeout: 15_000 });
}

/**
 * Agrega un producto al carrito desde la PDP.
 * Asume estar en /productos/<slug>.
 */
export async function addToCart(page: Page) {
  const addBtn = page.locator('button:has-text("Agregar al carrito")');
  await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await addBtn.click();
  // Esperar toast o badge del carrito
  await page.waitForTimeout(1000);
}

/**
 * Aplica un cupón en la página del carrito.
 * Asume estar en /cart con al menos un item.
 */
export async function applyCoupon(page: Page, code: string) {
  const input = page.locator('input[placeholder*="cupón" i], input[aria-label*="cupón" i]');
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.fill(code);
  await page.locator('button:has-text("Aplicar")').click();
  await page.waitForTimeout(1500);
}

/**
 * Login helper que retorna true si el login fue exitoso (redirigió).
 */
export async function tryLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(/^\/($|admin|account)/, { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

// Extender el test base con helpers si es necesario
export const test = base;
export { expect } from '@playwright/test';
