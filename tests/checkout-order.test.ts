import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutSchema, canOwnerCancelOrder } from '@/lib/checkout-order';

const R2_HOST = 'cdn.mundotech.test';
const LEGIT_PROOF = `https://${R2_HOST}/proofs/abc.webp`;

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
    paymentProofUrl: LEGIT_PROOF,
    items: [{ productId: 'prod-1', quantity: 1 }],
    ...overrides,
  };
}

describe('checkoutSchema paymentProofUrl (PRD-007)', () => {
  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', `https://${R2_HOST}`);
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta comprobante legítimo de R2', () => {
    const parsed = checkoutSchema.safeParse(validCheckoutBody());
    expect(parsed.success).toBe(true);
  });

  it('rechaza URL maliciosa antes de validar otros campos de negocio', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({ paymentProofUrl: 'https://evil.com/proof.jpg' }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain(
        'El comprobante de pago debe provenir del almacenamiento autorizado.',
      );
    }
  });

  it('rechaza javascript: y data:', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x']) {
      const parsed = checkoutSchema.safeParse(validCheckoutBody({ paymentProofUrl: bad }));
      expect(parsed.success).toBe(false);
    }
  });

  it('exige comprobante cuando el método lo requiere', () => {
    const parsed = checkoutSchema.safeParse(validCheckoutBody({ paymentProofUrl: null }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes('paymentProofUrl'))).toBe(true);
    }
  });
});

describe('owner self-service cancel rules', () => {
  it('permite Pendiente y Pendiente verificación Binance', () => {
    expect(canOwnerCancelOrder({ status: 'Pendiente' })).toBe(true);
    expect(canOwnerCancelOrder({ status: 'Pendiente verificación Binance' })).toBe(true);
  });

  it('rechaza En Proceso, Enviado, Entregado y Cancelado', () => {
    for (const status of ['En Proceso', 'Enviado', 'Entregado', 'Cancelado'] as const) {
      expect(canOwnerCancelOrder({ status })).toBe(false);
    }
  });

  it('rechaza si hay tracking aunque el estado sea Pendiente', () => {
    expect(canOwnerCancelOrder({ status: 'Pendiente', trackingNumber: 'ABC123' })).toBe(false);
    expect(canOwnerCancelOrder({ status: 'Pendiente', shippedAt: '2026-06-01T00:00:00.000Z' })).toBe(false);
  });

  it('rechaza pedido ya cancelado', () => {
    expect(canOwnerCancelOrder({ status: 'Cancelado' })).toBe(false);
  });
});
