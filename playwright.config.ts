import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * Playwright E2E para MundoTech.
 * - Nunca apunta a producción — aborta si baseURL contiene mundotechve.com.
 * - BD: DATABASE_URL de E2E debe contener "_e2e" o "test" (validado en scripts/e2e-reset-db.ts).
 * - Emails: mockeados via NODE_ENV=E2E en lib/resend.tsx (no-op automático).
 * - R2: mockeados via NODE_ENV=E2E (no-op en subidas, devuelve URL dummy).
 * - Traces/capturas: solo al fallar.
 * - CI: 2 retries; local: 0 retries.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

if (BASE_URL.includes('mundotechve.com')) {
  throw new Error(
    `[E2E SAFETY] BASE_URL contiene 'mundotechve.com' (${BASE_URL}). ` +
    'Nunca apuntes pruebas E2E a producción. Usa localhost o un VPS de staging.',
  );
}

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: path.join(process.cwd(), 'test-results'),
  webServer: process.env.CI
    ? {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 60_000,
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'E2E',
        },
      }
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'E2E',
        },
      },
});
