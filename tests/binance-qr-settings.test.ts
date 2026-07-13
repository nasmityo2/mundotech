import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, storeSettingsSchema } from '@/lib/data-store';

describe('storeSettingsSchema — binanceQrUrl (R2 público)', () => {
  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.mundotechve.com');
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('permite binanceQrUrl vacío', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      binanceQrUrl: '',
    });
    expect(result.success).toBe(true);
  });

  it('acepta hostname R2 exacto en HTTPS', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      binanceQrUrl: 'https://cdn.mundotechve.com/assets/binance.webp',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza dominio externo', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      binanceQrUrl: 'https://images.example.com/qr.png',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza HTTP y subdominio engañoso', () => {
    const httpResult = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      binanceQrUrl: 'http://cdn.mundotechve.com/qr.png',
    });
    expect(httpResult.success).toBe(false);

    const deceptiveResult = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      binanceQrUrl: 'https://cdn.mundotechve.com.evil.test/qr.png',
    });
    expect(deceptiveResult.success).toBe(false);
  });
});
