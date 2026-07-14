/**
 * e2e/specs/guest-checkout.spec.ts — checkout invitado SOLO en CHECKOUT_MODE=whatsapp
 * @whatsapp
 */
import {
  test,
  expect,
  E2E_PRODUCTS,
  addProductToCart,
  fillWhatsAppGuestCheckout,
} from '../fixtures/constants';

test.describe('Guest Checkout @whatsapp', () => {
  test('checkout WhatsApp como invitado con guestToken', async ({ page }) => {
    let orderPostCount = 0;
    let guestToken = '';
    let orderNumber = 0;
    let postedChannel: string | undefined;

    await page.route('**/api/orders', async (route) => {
      if (route.request().method() === 'POST') {
        orderPostCount += 1;
        const response = await route.fetch();
        const body = (await response.json()) as {
          guestToken?: string;
          orderNumber?: number;
        };
        guestToken = body.guestToken ?? '';
        orderNumber = body.orderNumber ?? 0;
        const reqBody = route.request().postDataJSON() as { channel?: string };
        postedChannel = reqBody.channel;
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    });

    await addProductToCart(page, E2E_PRODUCTS.inStock.slug);
    await page.goto('/checkout');
    await expect(page.getByText(/Pedido por WhatsApp/i)).toBeVisible({ timeout: 10_000 });

    await fillWhatsAppGuestCheckout(page);
    await page.getByRole('button', { name: /Realizar compra/i }).click();

    await expect.poll(() => orderPostCount, { timeout: 20_000 }).toBe(1);
    expect(guestToken.length).toBeGreaterThan(10);
    expect(orderNumber).toBeGreaterThan(0);
    expect(postedChannel).toBe('whatsapp');

    await page.goto(`/checkout/success?token=${encodeURIComponent(guestToken)}`);
    await expect(page.getByText(String(orderNumber).padStart(4, '0'))).toBeVisible();
  });
});
