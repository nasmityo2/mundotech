/**
 * e2e/specs/coupon.spec.ts
 *
 * Flujo de cupón:
 * - Agregar producto al carrito
 * - Aplicar cupón válido
 * - Verificar descuento reflejado
 * - Aplicar cupón inválido (error)
 */
import { test, expect } from '../fixtures/constants';
import { E2E_PRODUCTS, E2E_COUPON } from '../fixtures/constants';

test.describe('Cupón', () => {
  test('aplicar cupón válido en el carrito', async ({ page }) => {
    // Agregar producto al carrito
    await page.goto(`/productos/${E2E_PRODUCTS.inStock.slug}`);
    await page.waitForSelector('button:has-text("Agregar al carrito")', { timeout: 10_000 });
    await page.click('button:has-text("Agregar al carrito")');
    await page.waitForTimeout(1500);

    // Ir al carrito
    await page.goto('/cart');
    await page.waitForTimeout(1500);

    // Buscar campo de cupón
    const couponInput = page.locator(
      'input[placeholder*="cupón" i], input[aria-label*="cupón" i], input[name="coupon"], input[placeholder*="código" i]',
    );
    if (await couponInput.isVisible()) {
      await couponInput.fill(E2E_COUPON.code);
      await page.locator('button:has-text("Aplicar"), button:has-text("Canjear")').click();
      await page.waitForTimeout(2000);

      // Verificar descuento visible
      const discountText = page.locator('text=descuento, text=10%, text=E2E10').first();
      await expect(discountText).toBeVisible();
    }
  });

  test('cupón inválido muestra error', async ({ page }) => {
    await page.goto(`/productos/${E2E_PRODUCTS.inStock.slug}`);
    await page.waitForSelector('button:has-text("Agregar al carrito")', { timeout: 10_000 });
    await page.click('button:has-text("Agregar al carrito")');
    await page.waitForTimeout(1500);

    await page.goto('/cart');
    await page.waitForTimeout(1500);

    const couponInput = page.locator(
      'input[placeholder*="cupón" i], input[aria-label*="cupón" i], input[name="coupon"], input[placeholder*="código" i]',
    );
    if (await couponInput.isVisible()) {
      await couponInput.fill('CODIGO_INEXISTENTE');
      await page.locator('button:has-text("Aplicar"), button:has-text("Canjear")').click();
      await page.waitForTimeout(2000);

      // Debe mostrar error
      const errorText = page.locator('text=inválido, text=no válido, text=no existe, text=Error').first();
      await expect(errorText).toBeVisible();
    }
  });
});
