import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutSchema } from '@/lib/checkout-order';
import { hashToken } from '@/lib/security';

const R2_HOST = 'cdn.mundotech.test';
const LEGIT_PROOF = `https://${R2_HOST}/proofs/abc.webp`;
const VALID_TOKEN = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d';

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
    paymentProofKey: 'proofs/uuid12345.webp',
    paymentUploadToken: VALID_TOKEN,
    paymentProofUrl: LEGIT_PROOF,
    items: [{ productId: 'prod-1', quantity: 1 }],
    ...overrides,
  };
}

describe('checkoutSchema — paymentUploadToken (Sesión 05)', () => {
  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_BASE_URL', `https://${R2_HOST}`);
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_BASE_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Token ausente ──────────────────────────────────────────────
  it('exige token de upload cuando se envía paymentProofKey', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({ paymentUploadToken: undefined }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain(
        'Token de subida requerido. Obtén uno en la página de pago.',
      );
    }
  });

  it('no exige token para pedidos WhatsApp', () => {
    // WhatsApp no exige comprobante, luego no exige token
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        channel: 'whatsapp',
        paymentProofKey: null,
        paymentProofUrl: null,
        paymentUploadToken: undefined,
        paymentReference: undefined,
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it('no exige token para Cashea', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({
        paymentMethod: 'Cashea',
        paymentReference: undefined,
        paymentProofKey: null,
        paymentProofUrl: null,
        paymentUploadToken: undefined,
      }),
    );
    expect(parsed.success).toBe(true);
  });

  // ── Token vacío ────────────────────────────────────────────────
  it('rechaza token vacío con paymentProofKey presente', () => {
    const parsed = checkoutSchema.safeParse(
      validCheckoutBody({ paymentUploadToken: '' }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain(
        'Token de subida requerido. Obtén uno en la página de pago.',
      );
    }
  });

  // ── Token aceptado en body válido ──────────────────────────────
  it('acepta checkout con token de upload presente', () => {
    const parsed = checkoutSchema.safeParse(validCheckoutBody());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.paymentUploadToken).toBe(VALID_TOKEN);
    }
  });

  // ── paymentUploadToken no se filtra del parse ──────────────────
  it('incluye paymentUploadToken en el tipo parseado', () => {
    const parsed = checkoutSchema.safeParse(validCheckoutBody());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toHaveProperty('paymentUploadToken');
    }
  });
});

describe('hashToken — consistencia y entropía', () => {
  it('produce hash SHA-256 hexadecimal de 64 caracteres', () => {
    const hash = hashToken(VALID_TOKEN);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('es determinista: mismo input → mismo hash', () => {
    expect(hashToken(VALID_TOKEN)).toBe(hashToken(VALID_TOKEN));
  });

  it('tokens diferentes producen hashes diferentes', () => {
    const hash1 = hashToken('token-a');
    const hash2 = hashToken('token-b');
    expect(hash1).not.toBe(hash2);
  });
});

describe('upload-session — generación de token de alta entropía', () => {
  it('randomBytes(32) base64url tiene 43 caracteres', () => {
    const token = randomBytes(32).toString('base64url');
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // ~256 bits de entropía
    expect(token.length).toBe(43);
  });
});
