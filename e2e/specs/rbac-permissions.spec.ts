/**
 * RBAC E2E matrix — permisos granulares del panel admin.
 */
import { test, expect, doLogin, E2E_RBAC, E2E_CLIENT } from '../fixtures/constants';

test.describe('RBAC permisos @RBAC', () => {
  test('Pedidos ve pedidos pero no catálogo', async ({ page }) => {
    await doLogin(page, E2E_RBAC.pedidos.email, E2E_RBAC.pedidos.password);
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/admin\/orders/);
    await page.goto('/admin/products');
    await expect(page).toHaveURL(/\/admin\/unauthorized/);
  });

  test('Catálogo no accede a pedidos', async ({ page }) => {
    await doLogin(page, E2E_RBAC.catalogo.email, E2E_RBAC.catalogo.password);
    await page.goto('/admin/products');
    await expect(page).toHaveURL(/\/admin\/products/);
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/admin\/unauthorized/);
  });

  test('Finanzas accede a settings sin datos generales sensibles en UI', async ({ page }) => {
    await doLogin(page, E2E_RBAC.finanzas.email, E2E_RBAC.finanzas.password);
    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/\/admin\/settings/);
    await expect(page.getByText('Tasa de Cambio USD / Bs')).toBeVisible();
    await expect(page.getByText('Información de la Tienda')).toHaveCount(0);
  });

  test('Admin sin permisos no entra al panel', async ({ page }) => {
    await doLogin(page, E2E_RBAC.sinPermisos.email, E2E_RBAC.sinPermisos.password);
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin\/orders/);
    const url = page.url();
    expect(url.endsWith('/') || url.includes('/login')).toBeTruthy();
  });

  test('API pedidos ajeno — cliente 403', async ({ page, request }) => {
    await doLogin(page, E2E_CLIENT.email, E2E_CLIENT.password);
    const res = await page.request.get('/api/orders/non-existent-order-id');
    expect([403, 401]).toContain(res.status());
  });

  test('Superadmin ve Usuarios en navegación móvil', async ({ page }) => {
    await doLogin(page, E2E_RBAC.superadmin.email, E2E_RBAC.superadmin.password);
    await page.goto('/admin/menu');
    await expect(page.getByText('Usuarios')).toBeVisible();
  });
});
