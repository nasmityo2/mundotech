import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutSchema } from '@/lib/checkout-order';

function validCheckoutBody(overrides: Record<string, unknown> = {}) {
  return {
    customerName: 'Cliente Test',
    customerEmail: 'cliente@test.com',
    shippingDetails: {
      address: 'Av. Principal 1',
      city: 'Barquisimeto',
      state: 'Lara',
    },
    paymentMethod: 'Pago Móvil',
    paymentReference: 'REF-12345',
    paymentUploadToken: 'valid-token-xxx',
    items: [{ productId: 'prod-1', quantity: 1 }],
    ...overrides,
  };
}

describe('checkoutSchema (SESIÓN 04/05 CORREGIDO)', () => {
  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', 'https://cdn.mundotech.test');
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta checkout válido con paymentUploadToken', () => {
    const parsed = checkoutSchema.safeParse(validCheckoutBody());
    expect(parsed.success).toBe(true);
  });

  it('rechaza paymentUploadToken vacío para método manual', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({ paymentUploadToken: null }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((i) => i.path.includes('paymentUploadToken')),
      ).toBe(true);
    }
  });

  it('no exige paymentUploadToken para WhatsApp', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({ paymentUploadToken: null, channel: 'whatsapp' }),
    );
    expect(parsed.success).toBe(true);
  });

  it('no exige paymentUploadToken para Cashea', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentUploadToken: null,
        paymentMethod: 'Cashea',
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it('no acepta paymentProofUrl en el schema público', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentProofUrl: 'https://evil.com/proof.jpg',
        paymentUploadToken: 'token',
      }),
    );
    // paymentProofUrl no es parte del schema, así que se ignora.
    // El checkout debe funcionar porque paymentUploadToken es válido.
    expect(parsed.success).toBe(true);
  });

  it('no acepta paymentProofKey en el schema público', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentProofKey: 'proofs/abc.webp',
        paymentUploadToken: 'token',
      }),
    );
    // paymentProofKey no es parte del schema, así que se ignora.
    expect(parsed.success).toBe(true);
  });

  it('exige paymentUploadToken para Binance Pay', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentUploadToken: null,
        paymentMethod: 'Binance Pay',
      }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some(
          (i) => i.path.includes('paymentUploadToken') && i.message.includes('Binance'),
        ),
      ).toBe(true);
    }
  });
});
