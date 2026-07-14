import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolveCheckoutMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadMode() {
    const mod = await import('@/lib/checkout-mode');
    return mod;
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it('undefined => full', async () => {
    vi.stubEnv('CHECKOUT_MODE', undefined);
    const { resolveCheckoutMode, CHECKOUT_MODE } = await loadMode();
    expect(resolveCheckoutMode(undefined)).toBe('full');
    expect(CHECKOUT_MODE).toBe('full');
  });

  it('"" => full', async () => {
    vi.stubEnv('CHECKOUT_MODE', '');
    const { resolveCheckoutMode, CHECKOUT_MODE } = await loadMode();
    expect(resolveCheckoutMode('')).toBe('full');
    expect(CHECKOUT_MODE).toBe('full');
  });

  it('invalid => full', async () => {
    vi.stubEnv('CHECKOUT_MODE', 'bogus');
    const { resolveCheckoutMode, CHECKOUT_MODE } = await loadMode();
    expect(resolveCheckoutMode('bogus')).toBe('full');
    expect(CHECKOUT_MODE).toBe('full');
  });

  it('full => full', async () => {
    vi.stubEnv('CHECKOUT_MODE', 'full');
    const { resolveCheckoutMode, CHECKOUT_MODE, isFullCheckout } = await loadMode();
    expect(resolveCheckoutMode('full')).toBe('full');
    expect(CHECKOUT_MODE).toBe('full');
    expect(isFullCheckout).toBe(true);
  });

  it('whatsapp => whatsapp', async () => {
    vi.stubEnv('CHECKOUT_MODE', 'whatsapp');
    const { resolveCheckoutMode, CHECKOUT_MODE, isWhatsAppCheckout } = await loadMode();
    expect(resolveCheckoutMode('whatsapp')).toBe('whatsapp');
    expect(CHECKOUT_MODE).toBe('whatsapp');
    expect(isWhatsAppCheckout).toBe(true);
  });

  it('case/espacios whatsapp => whatsapp', async () => {
    vi.stubEnv('CHECKOUT_MODE', '  WhatsApp  ');
    const { resolveCheckoutMode, CHECKOUT_MODE } = await loadMode();
    expect(resolveCheckoutMode('  WhatsApp  ')).toBe('whatsapp');
    expect(CHECKOUT_MODE).toBe('whatsapp');
  });
});
