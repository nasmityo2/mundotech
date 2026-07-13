/**
 * e2e/specs/guest-checkout.spec.ts
 */
import {
  test,
  expect,
  E2E_PRODUCTS,
  addProductToCart,
  fillGuestShippingStep,
  fillPagoMovilPaymentStep,
} from '../fixtures/constants';

test.describe('Guest Checkout', () => {
  test('checkout como invitado con comprobante PNG y token de acceso', async ({ page }) => {
    let orderPostCount = 0;
    let guestToken = '';
    let orderId = '';
    let orderNumber = 0;

    await page.route('**/api/orders', async (route) => {
      if (route.request().method() === 'POST') {
        orderPostCount += 1;
        const response = await route.fetch();
        const body = (await response.json()) as {
          guestToken?: string;
          id?: string;
          orderNumber?: number;
        };
        guestToken = body.guestToken ?? '';
        orderId = body.id ?? '';
        orderNumber = body.orderNumber ?? 0;
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    });

    await addProductToCart(page, E2E_PRODUCTS.inStock.slug);
    await page.goto('/checkout');
    await fillGuestShippingStep(page);
    await fillPagoMovilPaymentStep(page);

    const confirmBtn = page.getByRole('button', { name: /Confirmar pedido/i });
    await confirmBtn.click();

    await expect.poll(() => orderPostCount, { timeout: 20_000 }).toBe(1);
    expect(guestToken.length).toBeGreaterThan(10);
    expect(orderNumber).toBeGreaterThan(0);

    await page.goto(`/checkout/success?token=${encodeURIComponent(guestToken)}`);
    await expect(page.getByText(String(orderNumber).padStart(4, '0'))).toBeVisible();

    await page.goto(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
    await expect(
      page.getByText(/No encontramos este pedido/i),
    ).toBeVisible();
  });
});
