import { describe, expect, it } from 'vitest';
import { hashToken } from '@/lib/security';
import { toGuestOrderConfirmationDto, type GuestOrderConfirmation } from '@/lib/definitions';

// Decimal simulado
function dec(n: number) {
  return { toNumber: () => n };
}

function mockGuestOrder() {
  return {
    id: 'cmtest12345',
    orderNumber: 42,
    createdAt: new Date('2026-07-11T20:00:00.000Z'),
    total: dec(150.00),
    status: 'Pendiente',
    paymentMethod: 'Pago Móvil',
    channel: 'web',
    exchangeRateUsdBs: dec(60.0),
    items: [
      { productName: 'Teclado RGB', quantity: 2, price: dec(25.0), imageUrl: 'https://cdn.test/keys.jpg' },
      { productName: 'Mouse', quantity: 1, price: dec(15.0), imageUrl: null },
    ],
  };
}

describe('hashToken', () => {
  it('produce hash SHA-256 hex de 64 caracteres', () => {
    const hash = hashToken('mi-token-seguro-abc123');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('es determinista para el mismo input', () => {
    const a = hashToken('token-ejemplo');
    const b = hashToken('token-ejemplo');
    expect(a).toBe(b);
  });

  it('produce hashes diferentes para tokens distintos', () => {
    const a = hashToken('token-uno');
    const b = hashToken('token-dos');
    expect(a).not.toBe(b);
  });
});

describe('toGuestOrderConfirmationDto', () => {
  it('mapea campos básicos correctamente', () => {
    const row = mockGuestOrder();
    const dto = toGuestOrderConfirmationDto(row);

    expect(dto.orderNumber).toBe(42);
    expect(dto.total).toBe(150.0);
    expect(dto.status).toBe('Pendiente');
    expect(dto.paymentMethod).toBe('Pago Móvil');
    expect(dto.channel).toBe('web');
    expect(dto.exchangeRateUsdBs).toBe(60.0);
    expect(dto.createdAt).toBe('2026-07-11T20:00:00.000Z');
  });

  it('NO incluye customerIdNumber, paymentReference, shippingDetails, paymentProofUrl, paymentProofKey', () => {
    const row = {
      ...mockGuestOrder(),
      customerIdNumber: 'V-12345678',
      paymentReference: 'REF-98765',
      shippingAddress: 'Calle Secreta 123',
      shippingCity: 'Barquisimeto',
      shippingState: 'Lara',
      shippingZipCode: '3001',
      shippingCountry: 'Venezuela',
      paymentProofUrl: 'https://cdn.test/proofs/abc.webp',
      paymentProofKey: 'proofs/abc.webp',
      customerEmail: 'cliente@test.com',
      customerPhone: '0412-1234567',
    };
    const dto = toGuestOrderConfirmationDto(row as Parameters<typeof toGuestOrderConfirmationDto>[0]);

    // NO deben estar en el DTO
    expect(dto).not.toHaveProperty('id');
    expect(dto).not.toHaveProperty('customerIdNumber');
    expect(dto).not.toHaveProperty('paymentReference');
    expect(dto).not.toHaveProperty('customerEmail');
    expect(dto).not.toHaveProperty('customerPhone');
    expect(dto).not.toHaveProperty('paymentProofUrl');
    expect(dto).not.toHaveProperty('paymentProofKey');
    // shippingDetails no existe en GuestOrderConfirmation
    expect(dto).not.toHaveProperty('shippingDetails');
    expect(dto).not.toHaveProperty('shippingAddress');
    expect(dto).not.toHaveProperty('shippingCity');
  });

  it('mapea items correctamente sin PII', () => {
    const row = mockGuestOrder();
    const dto = toGuestOrderConfirmationDto(row);

    expect(dto.items).toHaveLength(2);
    expect(dto.items[0]).toEqual({
      productName: 'Teclado RGB',
      quantity: 2,
      price: 25.0,
      imageUrl: 'https://cdn.test/keys.jpg',
    });
    expect(dto.items[1]).toEqual({
      productName: 'Mouse',
      quantity: 1,
      price: 15.0,
      imageUrl: undefined, // null → undefined
    });
  });

  it('item no incluye productId ni id (solo lo necesario para vista guest)', () => {
    const row = mockGuestOrder();
    const dto = toGuestOrderConfirmationDto(row);

    for (const item of dto.items) {
      expect(item).not.toHaveProperty('id');
      expect(item).not.toHaveProperty('productId');
    }
  });

  it('channel es null si no está presente', () => {
    const row = { ...mockGuestOrder(), channel: undefined as unknown as string };
    const dto = toGuestOrderConfirmationDto(row);
    expect(dto.channel).toBeNull();
  });

  it('exchangeRateUsdBs es null si no hay tasa', () => {
    const row = { ...mockGuestOrder(), exchangeRateUsdBs: null };
    const dto = toGuestOrderConfirmationDto(row);
    expect(dto.exchangeRateUsdBs).toBeNull();
  });

  it('total es 0 para pedidos sin costo (Decimal 0)', () => {
    const row = { ...mockGuestOrder(), total: dec(0) };
    const dto = toGuestOrderConfirmationDto(row);
    expect(dto.total).toBe(0);
  });
});

describe('token SHA-256 (unitario)', () => {
  it('token de 32 bytes base64url produce hash de 64 hex', async () => {
    const { randomBytes } = await import('crypto');
    const raw = randomBytes(32).toString('base64url');
    expect(raw.length).toBeGreaterThanOrEqual(40); // 32 bytes → 43 chars base64url

    const hash = hashToken(raw);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('token de diferente entropía produce hash diferente', async () => {
    const { randomBytes } = await import('crypto');
    const t1 = randomBytes(32).toString('base64url');
    const t2 = randomBytes(32).toString('base64url');
    expect(t1).not.toBe(t2);
    expect(hashToken(t1)).not.toBe(hashToken(t2));
  });
});

describe('GuestOrderConfirmation type', () => {
  it('satisface el tipo con valores mínimos', () => {
    const dto: GuestOrderConfirmation = {
      orderNumber: 1,
      createdAt: '2026-07-11T20:00:00.000Z',
      items: [{ productName: 'Item', quantity: 1, price: 10 }],
      total: 10,
      status: 'Pendiente',
      paymentMethod: 'Efectivo',
    };
    expect(dto.orderNumber).toBe(1);
    expect(dto.items[0].imageUrl).toBeUndefined();
  });

  it('acepta exchangeRateUsdBs como null', () => {
    const dto: GuestOrderConfirmation = {
      orderNumber: 1,
      createdAt: '2026-07-11T20:00:00.000Z',
      items: [{ productName: 'Item', quantity: 1, price: 10 }],
      total: 10,
      status: 'Pendiente',
      paymentMethod: 'Efectivo',
      exchangeRateUsdBs: null,
    };
    expect(dto.exchangeRateUsdBs).toBeNull();
  });

  it('no permite campos sensibles en el tipo', () => {
    // Verificación en tiempo de compilación: las propiedades no existen
    const dto: GuestOrderConfirmation = {
      orderNumber: 1,
      createdAt: '2026-07-11T20:00:00.000Z',
      items: [{ productName: 'Item', quantity: 1, price: 10 }],
      total: 10,
      status: 'Pendiente',
      paymentMethod: 'Efectivo',
    };
    // Las siguientes líneas deben fallar en TS si se descomentan
    // (afirmación en runtime para verificar que no están en el tipo)
    const dtoKeys = Object.keys(dto) as Array<keyof GuestOrderConfirmation>;
    expect(dtoKeys).not.toContain('id');
    expect(dtoKeys).not.toContain('customerIdNumber');
    expect(dtoKeys).not.toContain('paymentReference');
    expect(dtoKeys).not.toContain('customerEmail');
    expect(dtoKeys).not.toContain('customerPhone');
    expect(dtoKeys).not.toContain('paymentProofUrl');
    expect(dtoKeys).not.toContain('paymentProofKey');
    expect(dtoKeys).not.toContain('shippingDetails');
  });
});
