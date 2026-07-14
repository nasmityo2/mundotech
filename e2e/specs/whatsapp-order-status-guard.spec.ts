/**
 * e2e/specs/whatsapp-order-status-guard.spec.ts — SOLO en CHECKOUT_MODE=whatsapp
 * @whatsapp
 *
 * OBJETIVOS A/B/C: un pedido WhatsApp (`stockDeducted=false`) no puede avanzar
 * a En Proceso/Enviado/Entregado por las rutas genéricas de estado (individual
 * ni bulk); solo `validateOrderPayment()` («Validar pago») descuenta stock y
 * avanza el estado, de forma atómica.
 */
import {
  test,
  expect,
  E2E_ADMIN,
  E2E_PRODUCTS,
  addProductToCart,
  fillWhatsAppGuestCheckout,
  readProductStock,
  doLogin,
} from '../fixtures/constants';

const GUARD_MESSAGE =
  'Este pedido de WhatsApp aún no ha descontado inventario. Valida el pago con la acción «Validar pago» antes de avanzar el estado.';

test.describe('Guard de estado — pedidos WhatsApp @whatsapp', () => {
  test('bloquea avance genérico sin stock descontado; Validar pago descuenta stock y avanza', async ({ page }) => {
    // 1) Crear pedido WhatsApp como invitado y capturar su orderNumber.
    let orderNumber = 0;
    await page.route('**/api/orders', async (route) => {
      if (route.request().method() === 'POST') {
        const response = await route.fetch();
        const body = (await response.json()) as { orderNumber?: number };
        orderNumber = body.orderNumber ?? 0;
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    });

    const stockBefore = await readProductStock(page, E2E_PRODUCTS.inStock.slug);

    await addProductToCart(page, E2E_PRODUCTS.inStock.slug);
    await page.goto('/checkout');
    await fillWhatsAppGuestCheckout(page);
    await page.getByRole('button', { name: /Realizar compra/i }).click();
    await expect.poll(() => orderNumber, { timeout: 20_000 }).toBeGreaterThan(0);

    // El checkout WhatsApp valida disponibilidad pero NO descuenta stock aún.
    const stockAfterCreate = await readProductStock(page, E2E_PRODUCTS.inStock.slug);
    expect(stockAfterCreate).toBe(stockBefore);

    // 2) Entrar como admin y localizar el pedido para obtener su id interno.
    await doLogin(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto('/admin/orders');
    await page.getByPlaceholder(/Buscar por #, nombre, teléfono, cédula o referencia/i)
      .fill(String(orderNumber));
    const row = page.getByText(`#${String(orderNumber).padStart(4, '0')}`).first();
    await row.waitFor({ timeout: 10_000 });
    await row.click();
    await page.waitForURL(/\/admin\/orders\/.+/, { timeout: 10_000 });
    const orderId = page.url().split('/admin/orders/')[1]?.split(/[?#]/)[0] ?? '';
    expect(orderId.length).toBeGreaterThan(0);

    // 3) La UI no debe ofrecer avanzar el estado directamente (solo Pendiente/Cancelado).
    await expect(page.getByRole('button', { name: 'Marcar como En Proceso' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Marcar como Enviado' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Marcar como Entregado' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Validar pago/i })).toBeVisible();

    // 4) La seguridad real vive en el endpoint: un PUT directo debe rechazarse con 409.
    const blockedResponse = await page.request.put(`/api/orders/${orderId}/status`, {
      data: { status: 'En Proceso' },
    });
    expect(blockedResponse.status()).toBe(409);
    const blockedBody = await blockedResponse.json();
    expect(blockedBody.message).toBe(GUARD_MESSAGE);

    // El bulk-status-update también debe rechazar toda la operación.
    const bulkBlocked = await page.request.post('/api/orders/bulk-status-update', {
      data: { orderIds: [orderId], status: 'En Proceso' },
    });
    expect(bulkBlocked.status()).toBe(409);
    const bulkBlockedBody = await bulkBlocked.json();
    expect(bulkBlockedBody.updatedCount).toBe(0);

    // Ninguno de los intentos bloqueados modificó el estado ni el stock.
    const stockAfterBlocked = await readProductStock(page, E2E_PRODUCTS.inStock.slug);
    expect(stockAfterBlocked).toBe(stockBefore);

    // 5) «Validar pago» descuenta stock y avanza el estado en una sola operación atómica.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Validar pago/i }).click();
    await expect(page.getByText('En Proceso', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    const stockAfterValidate = await readProductStock(page, E2E_PRODUCTS.inStock.slug);
    expect(stockAfterValidate).toBe(stockBefore - 1);

    // 6) Ahora que el stock ya se descontó, el avance genérico SÍ debe permitirse.
    const allowedResponse = await page.request.put(`/api/orders/${orderId}/status`, {
      data: { status: 'En Proceso' },
    });
    expect(allowedResponse.status()).toBe(200);
  });
});
