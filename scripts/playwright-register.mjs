import { chromium } from 'playwright';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://mundotechve.com';
const keepOpen = process.argv.includes('--keep-open');
const headless = process.argv.includes('--headless');
const timestamp = Date.now();

const user = {
  name: 'Usuario Playwright Test',
  email: `playwright-${timestamp}@mundotech-test.local`,
  password: 'TestPass123!',
};

async function main() {
  const started = Date.now();
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  console.log(headless ? 'Headless' : 'Visual (rápido)');

  await page.goto(`${BASE_URL}/registro`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#reg-name');

  await page.fill('#reg-name', user.name);
  await page.fill('#reg-email', user.email);
  await page.fill('#reg-password', user.password);
  await page.fill('#reg-confirm', user.password);
  await page.locator('form input[type="checkbox"]').check();

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/registro')),
    page.getByRole('button', { name: 'Crear cuenta' }).click(),
  ]);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log('\n--- Registro OK ---');
  console.log('Email:', user.email);
  console.log('Contraseña:', user.password);
  console.log('Tiempo:', `${elapsed}s`);

  if (keepOpen && !headless) {
    console.log('--keep-open: ventana abierta 5s');
    await page.waitForTimeout(5000);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
