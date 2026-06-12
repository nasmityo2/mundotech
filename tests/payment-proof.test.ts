import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTrustedPaymentProofUrl } from '@/lib/payment-proof';

const R2_HOST = 'cdn.mundotech.test';

describe('isTrustedPaymentProofUrl (PRD-007)', () => {
  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', `https://${R2_HOST}`);
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta URL legítima del dominio R2', () => {
    expect(isTrustedPaymentProofUrl(`https://${R2_HOST}/proofs/abc.webp`)).toBe(true);
  });

  it('rechaza dominio externo', () => {
    expect(isTrustedPaymentProofUrl('https://evil.com/proof.jpg')).toBe(false);
  });

  it('rechaza suplantación por sufijo de host', () => {
    expect(isTrustedPaymentProofUrl(`https://${R2_HOST}.evil.com/x`)).toBe(false);
  });

  it('rechaza suplantación por query string', () => {
    expect(isTrustedPaymentProofUrl(`https://evil.com/?r=${R2_HOST}`)).toBe(false);
  });

  it('rechaza javascript:, data:, http: y URLs relativas', () => {
    expect(isTrustedPaymentProofUrl('javascript:alert(1)')).toBe(false);
    expect(isTrustedPaymentProofUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isTrustedPaymentProofUrl(`http://${R2_HOST}/proof.jpg`)).toBe(false);
    expect(isTrustedPaymentProofUrl('/proofs/local.jpg')).toBe(false);
    expect(isTrustedPaymentProofUrl('')).toBe(false);
    expect(isTrustedPaymentProofUrl(null)).toBe(false);
    expect(isTrustedPaymentProofUrl(undefined)).toBe(false);
  });
});
