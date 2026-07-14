/**
 * e2e/specs/full-checkout-auth.spec.ts — auth obligatoria en CHECKOUT_MODE=full
 */
import {
  test,
  expect,
  E2E_CLIENT,
  E2E_PRODUCTS,
  addProductToCart,
  doLogin,
} from '../fixtures/constants';

test.describe('Full checkout auth', () => {
  test('guest no accede a /checkout ni crea orden; CLIENT autenticado sí', async ({ page, request }) => {
    await addProductToCart(page, E2E_PRODUCTS.inStock.slug);

    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    const guestOrder = await request.post('/api/orders', {
      data: {
        customerName: 'Atacante',
        customerPhone: '04121234567',
        customerEmail: 'atacante@e2e.test',
        customerIdNumber: '12345678',
        shippingMethod: 'tienda',
        shippingDetails: {
          address: 'Retiro',
          city: 'Barquisimeto',
          state: 'Lara',
          zipCode: 'N/A',
          country: 'Venezuela',
        },
        paymentMethod: 'Pago Móvil',
        paymentReference: '1234567890',
        items: [{ productId: 'prod-x', quantity: 1 }],
        channel: 'web',
      },
    });
    expect(guestOrder.status()).toBe(401);

    await doLogin(page, E2E_CLIENT.email, E2E_CLIENT.password);
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: /Envío/i })).toBeVisible({ timeout: 15_000 });

    const uploadSession = await request.post('/api/checkout/upload-session');
    expect(uploadSession.status()).toBe(401);

    const authedUpload = await page.request.post('/api/checkout/upload-session');
    expect(authedUpload.status()).toBe(200);
    const uploadBody = (await authedUpload.json()) as { token?: string };
    expect(uploadBody.token?.length).toBeGreaterThan(10);
  });
});
