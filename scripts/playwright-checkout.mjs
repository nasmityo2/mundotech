import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://mundotechve.com';
const PRODUCT_PATH = '/product/intercomunicador-para-casco-q58-max';
const PROOF_IMAGE = path.join(__dirname, 'test-proof.png');
const PROOF_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

if (!fs.existsSync(PROOF_IMAGE)) {
  fs.writeFileSync(PROOF_IMAGE, Buffer.from(PROOF_PNG_B64, 'base64'));
}

const timestamp = Date.now();
const keepOpen = process.argv.includes('--keep-open');
const headless = process.argv.includes('--headless');

const user = {
  name: 'Comprador Playwright',
  email: `checkout-${timestamp}@mundotech-test.local`,
  password: 'TestPass123!',
};

const shipping = {
  firstName: 'Carlos',
  lastName: 'Prueba E2E',
  idNumber: 'V-12345678',
  phoneNumber: '0412-5551234',
};

const payment = {
  bank: 'Banesco',
  holderIdNumber: 'V-87654321',
  holderPhone: '0414-5559876',
  referenceNumber: `PW${timestamp}`.slice(0, 12),
};

async function fillForm(page, fields) {
  for (const [selector, value] of fields) {
    await page.fill(selector, value);
  }
}

async function registerUser(page) {
  console.log('1/6 — Registro…');
  await page.goto(`${BASE_URL}/registro`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#reg-name');

  await fillForm(page, [
    ['#reg-name', user.name],
    ['#reg-email', user.email],
    ['#reg-password', user.password],
    ['#reg-confirm', user.password],
  ]);
  await page.locator('form input[type="checkbox"]').check();

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/registro'), { timeout: 30000 }),
    page.getByRole('button', { name: 'Crear cuenta' }).click(),
  ]);
  console.log('   OK', user.email);
}

async function waitForCartInStorage(page) {
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (!raw) return false;
      const cart = JSON.parse(raw);
      return Array.isArray(cart) && cart.length > 0 && cart[0]?.quantity > 0;
    } catch {
      return false;
    }
  });
}

async function addProductToCart(page) {
  console.log('2/6 — Carrito…');
  await page.goto(`${BASE_URL}${PRODUCT_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await waitForCartInStorage(page);
  console.log('   OK', PRODUCT_PATH);
}

async function goToCheckout(page) {
  console.log('3/6 — Checkout…');
  await page.goto(`${BASE_URL}/cart`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Proceder al pago/i }).first().click();
  await page.waitForURL(/\/checkout/);
}

async function fillShipping(page) {
  console.log('4/6 — Entrega…');
  await page.waitForSelector('#firstName');
  await fillForm(page, [
    ['#firstName', shipping.firstName],
    ['#lastName', shipping.lastName],
    ['#idNumber', shipping.idNumber],
    ['#phoneNumber', shipping.phoneNumber],
  ]);

  const emailVal = await page.inputValue('#email');
  if (!emailVal.trim()) {
    await page.fill('#email', user.email);
  }

  await page.getByRole('button', { name: /Continuar al pago/i }).click();
  await page.getByRole('button', { name: 'Pago Móvil' }).waitFor();
}

async function fillPayment(page) {
  console.log('5/6 — Pago…');
  await page.getByRole('button', { name: 'Pago Móvil' }).click();
  await page.waitForSelector('#bank');

  await page.selectOption('#bank', payment.bank);
  await fillForm(page, [
    ['#holderIdNumber', payment.holderIdNumber],
    ['#holderPhone', payment.holderPhone],
    ['#referenceNumber', payment.referenceNumber],
  ]);

  await page.locator('input[type="file"]').first().setInputFiles(PROOF_IMAGE);
  await page.getByText('Comprobante cargado').waitFor();

  await Promise.all([
    page.getByRole('button', { name: /Confirmar pedido/i }).waitFor({ state: 'visible' }),
    page.getByRole('button', { name: /Revisar pedido/i }).click(),
  ]);
}

async function confirmOrder(page) {
  console.log('6/6 — Confirmar…');
  await Promise.all([
    page.waitForURL(/checkout\/success/, { timeout: 45000 }),
    page.getByRole('button', { name: /Confirmar pedido/i }).click(),
  ]);
}

async function main() {
  const started = Date.now();
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(30000);

  console.log(headless ? 'Headless' : 'Visual (rápido)\n');

  try {
    await registerUser(page);
    await addProductToCart(page);
    await goToCheckout(page);
    await fillShipping(page);
    await fillPayment(page);
    await confirmOrder(page);

    const orderUrl = page.url();
    const orderId = new URL(orderUrl).searchParams.get('orderId');
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    console.log('\n--- Compra completada ---');
    console.log('Cuenta:', user.email, '/', user.password);
    console.log('Pedido:', orderId ?? orderUrl);
    console.log('Tiempo:', `${elapsed}s`);

    if (keepOpen && !headless) {
      console.log('--keep-open: ventana abierta 5s');
      await page.waitForTimeout(5000);
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    await page.screenshot({ path: 'scripts/playwright-checkout-error.png', fullPage: true });
    console.error('\nError:', err.message);
    if (keepOpen && !headless) await page.waitForTimeout(5000);
    await browser.close();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
