import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config.mjs';

type HeaderRule = {
  source: string;
  headers: { key: string; value: string }[];
};

describe('next.config.mjs — headers estáticos /api/orders/:id/payment-proof', () => {
  it('define Referrer-Policy no-referrer y Cache-Control private,no-store', async () => {
    const rules = (await nextConfig.headers()) as HeaderRule[];
    const rule = rules.find((r) => r.source === '/api/orders/:id/payment-proof');
    expect(rule).toBeDefined();

    const referrerPolicy = rule?.headers.find((h) => h.key === 'Referrer-Policy');
    const cacheControl = rule?.headers.find((h) => h.key === 'Cache-Control');

    expect(referrerPolicy?.value).toBe('no-referrer');
    expect(cacheControl?.value).toBe('private, no-store');
  });

  it('la regla específica está declarada después de los headers globales', async () => {
    const rules = (await nextConfig.headers()) as HeaderRule[];
    const globalIndex = rules.findIndex((r) => r.source === '/(.*)');
    const specificIndex = rules.findIndex(
      (r) => r.source === '/api/orders/:id/payment-proof',
    );
    expect(globalIndex).toBeGreaterThanOrEqual(0);
    expect(specificIndex).toBeGreaterThan(globalIndex);
  });
});
