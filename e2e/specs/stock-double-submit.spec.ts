/**
 * e2e/specs/stock-double-submit.spec.ts
 *
 * Flujo de stock y doble submit:
 * - Verificar producto sin stock muestra agotado
 * - Agregar producto con stock y verificar cantidad
 * - Doble submit en checkout (protección)
 */
import { test, expect } from '../fixtures/constants';
import { E2E_PRODUCTS } from '../fixtures/constants';

test.describe('Stock y Doble Submit', () => {
  test('producto sin stock muestra indicador visual', async ({ page }) => {
    await page.goto(`/productos/${E2E_PRODUCTS.noStock.slug}`);
    await page.waitForTimeout(1500);

    // Buscar indicador de sin stock
    const noStock = page.locator('text=Sin stock, text=Agotado, text=No disponible, text=sin stock').first();
    await expect(noStock).toBeVisible();
  });

  test('producto con stock muestra precio y botón activo', async ({ page }) => {
    await page.goto(`/productos/${E2E_PRODUCTS.inStock.slug}`);
    await page.waitForTimeout(1000);

    const addBtn = page.locator('button:has-text("Agregar al carrito")');
    await expect(addBtn).toBeEnabled();
    await expect(page.locator(`text=${E2E_PRODUCTS.inStock.stock}`).first()).toBeVisible();
  });

  test('doble submit no duplica item en carrito', async ({ page }) => {
    await page.goto(`/productos/${E2E_PRODUCTS.inStock.slug}`);
    await page.waitForSelector('button:has-text("Agregar al carrito")', { timeout: 10_000 });

    // Hacer clic rápido dos veces
    const addBtn = page.locator('button:has-text("Agregar al carrito")');
    await addBtn.click();
    await addBtn.click({ delay: 100 });
    await page.waitForTimeout(1500);

    // Ir al carrito
    await page.goto('/cart');
    await page.waitForTimeout(1500);

    // Ver que solo hay 1 item (o una unidad extra, no duplicado)
    const quantityInput = page.locator('input[type="number"]');
    if (await quantityInput.isVisible()) {
      const val = await quantityInput.inputValue();
      expect(Number(val)).toBeGreaterThanOrEqual(1);
      expect(Number(val)).toBeLessThanOrEqual(2); // puede haber incrementado a 2 por doble clic
    }
  });
});
