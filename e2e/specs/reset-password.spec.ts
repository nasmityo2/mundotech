/**
 * e2e/specs/reset-password.spec.ts
 *
 * Flujo de reset de contraseña:
 * - Ir a /reset-password
 * - Verificar formulario
 * - Solicitar reset con email existente
 * - Verificar confirmación
 */
import { test, expect } from '../fixtures/constants';
import { E2E_CLIENT } from '../fixtures/constants';

test.describe('Reset Password', () => {
  test('página de reset carga correctamente', async ({ page }) => {
    await page.goto('/reset-password');
    await page.waitForTimeout(2000);

    // Debe mostrar input de email y botón submit
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('solicitar reset con email registrado muestra confirmación', async ({ page }) => {
    await page.goto('/reset-password');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(E2E_CLIENT.email);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Debe mostrar mensaje de éxito (sin revelar si el email existe o no)
    const successText = page.locator('text=enviado, text=revisa, text=correo, text=instrucciones').first();
    await expect(successText).toBeVisible();
  });

  test('enlace de login desde reset-password funciona', async ({ page }) => {
    await page.goto('/reset-password');
    await page.waitForTimeout(1000);

    // Buscar enlace "Volver al login" / "Iniciar sesión"
    const loginLink = page.locator('a:has-text("Iniciar sesión"), a:has-text("Login"), a:has-text("Volver")').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForURL(/login/, { timeout: 10_000 });
      await expect(page).toHaveURL(/login/);
    }
  });
});
