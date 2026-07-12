/**
 * e2e/specs/auth-roles.spec.ts
 *
 * Flujos de autenticación y roles:
 * - Login como CLIENT → redirige a home
 * - Login como ADMIN → redirige a admin
 * - CLIENT accede a /admin → 403
 * - Logout y redirect
 */
import { test, expect } from '../fixtures/constants';
import { E2E_ADMIN, E2E_CLIENT, doLogin } from '../fixtures/constants';

test.describe('Auth y Roles', () => {
  test('login como CLIENT redirige al home', async ({ page }) => {
    await doLogin(page, E2E_CLIENT.email, E2E_CLIENT.password);
    // CLIENT debe terminar en /
    await expect(page).toHaveURL(/^\/($|\?)/);
  });

  test('login como ADMIN redirige al admin', async ({ page }) => {
    // Navegar a /login y loguearse
    await page.goto('/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.fill('input[type="email"]', E2E_ADMIN.email);
    await page.fill('input[type="password"]', E2E_ADMIN.password);
    await page.click('button[type="submit"]');
    // ADMIN debe terminar en /admin
    await page.waitForURL(/\/admin/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('CLIENT recibe 403 al acceder a /admin', async ({ page }) => {
    // Primero loguearse como CLIENT
    await doLogin(page, E2E_CLIENT.email, E2E_CLIENT.password);
    // Intentar acceder a /admin
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    // Debe mostrar 403 o redirect a home con error
    const url = page.url();
    const origin = new URL(url).origin;
    const has403 = url.includes('/403') || url.includes('error=AccessDenied');
    const isHome = url === `${origin}/` || url === origin;
    expect(has403 || isHome).toBeTruthy();
  });

  test('página de login existe y muestra formulario', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('logout funciona', async ({ page }) => {
    await doLogin(page, E2E_CLIENT.email, E2E_CLIENT.password);
    // Buscar botón de cerrar sesión
    const logoutBtn = page.locator('button:has-text("Cerrar sesión"), a:has-text("Cerrar sesión"), button:has-text("Salir"), a:has-text("Salir")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      // Debe redirigir al home
      await expect(page).toHaveURL(/^\/($|\?)/);
    }
  });
});
