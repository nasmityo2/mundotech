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

/** Tokens de reset precargados en BD (hash en passwordResetToken). */
export const E2E_RESET_TOKENS = {
  valid: 'e2e-valid-reset-token-00000001',
  expired: 'e2e-expired-reset-token-00000002',
} as const;

/** PNG 1×1 con magic bytes válidos para upload de comprobante. */
export const E2E_PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export function productPdpPath(slug: string): string {
  return `/product/${slug}`;
}

export async function addProductToCart(page: Page, slug: string) {
  await page.goto(productPdpPath(slug));
  const addBtn = page.getByRole('button', { name: /¡Me lo llevo!/i });
  await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await addBtn.click();
  await page.waitForTimeout(800);
}

/**
 * Realiza login con el form de credenciales (email + password).
 */
export async function doLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^\/($|admin|account)/, { timeout: 15_000 });
}

export async function fillGuestShippingStep(page: Page) {
  await page.locator('#firstName').fill('Invitado');
  await page.locator('#lastName').fill('E2E');
  await page.locator('#idNumber').fill('12345678');
  await page.locator('#phoneNumber').fill('04121234567');
  await page.locator('#email').fill('invitado@e2e.test');
  await page.getByRole('button', { name: /Continuar al pago/i }).click();
  await page.getByRole('heading', { name: /Método de pago/i }).waitFor({ timeout: 10_000 });
}

export async function fillPagoMovilPaymentStep(page: Page) {
  await page.getByRole('button', { name: 'Pago Móvil' }).click();
  await page.locator('#bank').selectOption({ index: 1 });
  await page.locator('#holderIdNumber').fill('V-12345678');
  await page.locator('#holderPhone').fill('04121234567');
  await page.locator('#referenceNumber').fill('1234567890');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'comprobante-e2e.png',
    mimeType: 'image/png',
    buffer: E2E_PNG_1X1,
  });
  await page.getByRole('button', { name: /Revisar pedido/i }).click();
  await page.getByRole('heading', { name: /Revisión final/i }).waitFor({ timeout: 10_000 });
}

export async function readProductStock(page: Page, slug: string): Promise<number> {
  await page.goto(productPdpPath(slug));
  const stockText = page.locator('text=/En stock \\(\\d+ unidades\\)/');
  await stockText.waitFor({ state: 'visible', timeout: 10_000 });
  const match = (await stockText.innerText()).match(/\((\d+) unidades\)/);
  if (!match) {
    throw new Error('No se pudo leer el stock del producto en PDP');
  }
  return Number(match[1]);
}

export const test = base;
export { expect } from '@playwright/test';
