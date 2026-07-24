/**
 * e2e/specs/home-search-pdp-cart.spec.ts
 */
import {
  test,
  expect,
  E2E_PRODUCTS,
  productPdpPath,
  addProductToCart,
} from '../fixtures/constants';

test.describe('Home → Search → PDP → Cart', () => {
  test('homepage carga y muestra productos', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.getByText(E2E_PRODUCTS.inStock.name).first()).toBeVisible();
  });

  test('búsqueda encuentra producto con stock', async ({ page }) => {
    const query = E2E_PRODUCTS.inStock.name.slice(0, 12);
    await page.goto(`/buscar?q=${encodeURIComponent(query)}`);
    await expect(page.getByText(E2E_PRODUCTS.inStock.name).first()).toBeVisible();
  });

  test('PDP muestra detalles del producto', async ({ page }) => {
    await page.goto(productPdpPath(E2E_PRODUCTS.inStock.slug));
    await expect(page.getByRole('heading', { name: E2E_PRODUCTS.inStock.name })).toBeVisible();
    await expect(page.getByText('45.99').first()).toBeVisible();
    await expect(page.getByRole('button', { name: / Añadir al carrito/i })).toBeVisible();
  });

  test('agregar producto al carrito y verificar', async ({ page }) => {
    await addProductToCart(page, E2E_PRODUCTS.inStock.slug);
    await page.goto('/cart');
    await expect(page.getByText(E2E_PRODUCTS.inStock.name).first()).toBeVisible();
  });

  test('producto sin stock muestra Agotado y sin botón de compra', async ({ page }) => {
    await page.goto(productPdpPath(E2E_PRODUCTS.noStock.slug));
    await expect(page.getByText('Agotado').first()).toBeVisible();
    await expect(page.getByRole('button', { name: / Añadir al carrito/i })).toHaveCount(0);
  });
});
