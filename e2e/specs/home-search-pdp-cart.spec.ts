/**
 * e2e/specs/home-search-pdp-cart.spec.ts
 *
 * Flujo: home → search → PDP → carrito
 * - Verifica que la homepage carga productos
 * - Busca un producto por nombre
 * - Navega a la PDP
 * - Agrega al carrito
 * - Verifica el carrito
 */
import { test, expect } from '../fixtures/constants';
import { E2E_PRODUCTS } from '../fixtures/constants';

test.describe('Home → Search → PDP → Cart', () => {
  test('homepage carga y muestra productos', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    // Debería haber al menos un producto visible (el seed tiene "Audífonos Bluetooth Test")
    await expect(page.locator('text=Audífonos Bluetooth Test').first()).toBeVisible();
  });

  test('búsqueda encuentra producto con stock', async ({ page }) => {
    await page.goto('/');
    // Buscar barra de búsqueda
    const searchInput = page.locator('input[type="search"], input[placeholder*="buscar" i], [aria-label*="buscar" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(E2E_PRODUCTS.inStock.name.slice(0, 10));
      await searchInput.press('Enter');
      // Esperar resultados
      await page.waitForTimeout(2000);
      const result = page.locator(`text=${E2E_PRODUCTS.inStock.name}`);
      await expect(result.first()).toBeVisible();
    }
    // Si no hay búsqueda visible en homepage, navegar a search directo
    else {
      await page.goto(`/search?q=${encodeURIComponent(E2E_PRODUCTS.inStock.name.slice(0, 10))}`);
      await page.waitForTimeout(2000);
      const result = page.locator(`text=${E2E_PRODUCTS.inStock.name}`);
      await expect(result.first()).toBeVisible();
    }
  });

  test('PDP muestra detalles del producto', async ({ page }) => {
    await page.goto(`/productos/${E2E_PRODUCTS.inStock.slug}`);
    await expect(page.locator(`h1:has-text("${E2E_PRODUCTS.inStock.name}")`)).toBeVisible();
    // Verificar precio visible
    await expect(page.locator('text=45.99').first()).toBeVisible();
    // Botón "Agregar al carrito" debe estar presente
    await expect(page.locator('button:has-text("Agregar al carrito")')).toBeVisible();
  });

  test('agregar producto al carrito y verificar', async ({ page }) => {
    await page.goto(`/productos/${E2E_PRODUCTS.inStock.slug}`);
    await page.waitForSelector('button:has-text("Agregar al carrito")', { timeout: 10_000 });
    await page.click('button:has-text("Agregar al carrito")');
    // Esperar a que se actualice el carrito
    await page.waitForTimeout(1500);
    // Ir al carrito
    await page.goto('/cart');
    await page.waitForTimeout(1500);
    // Verificar que el producto aparece en el carrito
    await expect(page.locator(`text=${E2E_PRODUCTS.inStock.name}`).first()).toBeVisible();
  });

  test('producto sin stock muestra indicador y no deja agregar', async ({ page }) => {
    await page.goto(`/productos/${E2E_PRODUCTS.noStock.slug}`);
    await page.waitForTimeout(1500);
    // Verificar que se muestra "Sin stock" o "Agotado"
    const noStockText = page.locator('text=Sin stock, text=Agotado, text=sin stock');
    await expect(noStockText.first()).toBeVisible();
    // El botón de agregar al carrito debería estar deshabilitado o no existir
    const addBtn = page.locator('button:has-text("Agregar al carrito")');
    if (await addBtn.isVisible()) {
      await expect(addBtn).toBeDisabled();
    }
  });
});
