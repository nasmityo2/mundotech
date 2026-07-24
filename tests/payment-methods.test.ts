import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAYMENT_METHODS,
  mergePaymentMethodsWithDefaults,
  normalizePaymentMethod,
  calculatePaymentDiscountCents,
  resolvePaymentDiscountPercent,
  resolveAndValidatePaymentMethod,
  paymentMethodsArraySchema,
  PaymentMethodValidationError,
  buildCheckoutPaymentMethods,
  createCustomForeignCurrencyMethod,
  applyGlobalDivisaDiscount,
  type PaymentMethodConfig,
} from '@/lib/payment-methods';

function withDiscount(id: string, percent: number): PaymentMethodConfig {
  const base = DEFAULT_PAYMENT_METHODS.find((m) => m.id === id)!;
  return normalizePaymentMethod({
    ...base,
    active: true,
    discountEligible: true,
    discountEnabled: true,
    discountPercent: percent,
    recipientValue: id === 'zelle' ? 'zelle@example.com' : base.recipientValue,
  });
}

const settingsSlice = {
  pagoMovil: { bank: 'Banesco', phone: '0412', idNumber: 'V-1' },
  transferencia: {
    bank: 'Mercantil',
    accountNumber: '0105',
    accountHolder: 'MT',
    rif: 'J-1',
  },
  binancePayId: '12345678',
};

describe('payment-methods', () => {
  it('defaults incluyen built-ins y sin paymentMethods usa defaults', () => {
    const methods = mergePaymentMethodsWithDefaults(undefined);
    expect(methods.map((m) => m.id)).toEqual(
      expect.arrayContaining(['pagomovil', 'transferencia', 'binancepay', 'zelle', 'efectivo-divisas', 'cashea']),
    );
  });

  it('Binance 10% sobre 10000 céntimos → 1000', () => {
    expect(calculatePaymentDiscountCents(10000, 10)).toBe(1000);
  });

  it('Zelle 7.5% sobre 10000 céntimos → 750', () => {
    expect(calculatePaymentDiscountCents(10000, 7.5)).toBe(750);
  });

  it('redondeo determinista 19.99 * 7.5%', () => {
    // 1999 céntimos * 7.5% = 149.925 → round 150
    expect(calculatePaymentDiscountCents(1999, 7.5)).toBe(150);
  });

  it('sin descuento → 0', () => {
    const m = DEFAULT_PAYMENT_METHODS.find((x) => x.id === 'binancepay')!;
    expect(resolvePaymentDiscountPercent(m)).toBe(0);
    expect(calculatePaymentDiscountCents(10000, 0)).toBe(0);
  });

  it('Pago Móvil no puede activar descuento', () => {
    const bad = {
      ...DEFAULT_PAYMENT_METHODS.find((m) => m.id === 'pagomovil')!,
      discountEligible: true,
      discountEnabled: true,
      discountPercent: 10,
    };
    const parsed = paymentMethodsArraySchema.safeParse([
      ...DEFAULT_PAYMENT_METHODS.filter((m) => m.id !== 'pagomovil'),
      bad,
    ]);
    expect(parsed.success).toBe(false);
  });

  it('Transferencia y Cashea rechazan descuento', () => {
    for (const id of ['transferencia', 'cashea'] as const) {
      const bad = {
        ...DEFAULT_PAYMENT_METHODS.find((m) => m.id === id)!,
        discountEligible: true,
        discountEnabled: true,
        discountPercent: 5,
      };
      const list = DEFAULT_PAYMENT_METHODS.map((m) => (m.id === id ? bad : m));
      expect(paymentMethodsArraySchema.safeParse(list).success).toBe(false);
    }
  });

  it('IDs duplicados se rechazan', () => {
    const list = [...DEFAULT_PAYMENT_METHODS, { ...DEFAULT_PAYMENT_METHODS[0]! }];
    expect(paymentMethodsArraySchema.safeParse(list).success).toBe(false);
  });

  it('nombres duplicados case-insensitive se rechazan', () => {
    const custom = createCustomForeignCurrencyMethod(DEFAULT_PAYMENT_METHODS);
    custom.name = 'pago móvil';
    custom.active = false;
    custom.instructions = 'x';
    custom.recipientValue = 'y';
    expect(paymentMethodsArraySchema.safeParse([...DEFAULT_PAYMENT_METHODS, custom]).success).toBe(false);
  });

  it('más de 20 métodos se rechazan', () => {
    const extras = Array.from({ length: 20 }, (_, i) => {
      const c = createCustomForeignCurrencyMethod(DEFAULT_PAYMENT_METHODS);
      c.id = `custom:extra-${i}`;
      c.name = `Extra ${i}`;
      c.active = false;
      c.instructions = 'ok';
      c.recipientValue = 'ok';
      return c;
    });
    expect(paymentMethodsArraySchema.safeParse([...DEFAULT_PAYMENT_METHODS, ...extras]).success).toBe(false);
  });

  it('efectivo activo sin monedas se rechaza', () => {
    const list = DEFAULT_PAYMENT_METHODS.map((m) =>
      m.id === 'efectivo-divisas'
        ? { ...m, active: true, acceptedCurrencies: [] as string[] }
        : m,
    );
    expect(paymentMethodsArraySchema.safeParse(list).success).toBe(false);
  });

  it('custom activo sin destinatario se rechaza', () => {
    const custom = createCustomForeignCurrencyMethod(DEFAULT_PAYMENT_METHODS);
    custom.active = true;
    custom.instructions = 'Paga aquí';
    custom.recipientValue = '';
    expect(paymentMethodsArraySchema.safeParse([...DEFAULT_PAYMENT_METHODS, custom]).success).toBe(false);
  });

  it('Zelle Full exige referencia y comprobante', () => {
    const methods = [withDiscount('zelle', 7.5)];
    expect(() =>
      resolveAndValidatePaymentMethod({
        methods,
        paymentMethodId: 'zelle',
        channel: 'web',
        settings: settingsSlice,
        paymentReference: null,
        paymentUploadToken: null,
      }),
    ).toThrow(PaymentMethodValidationError);
  });

  it('Zelle WhatsApp no exige referencia ni comprobante', () => {
    const methods = [withDiscount('zelle', 7.5)];
    const resolved = resolveAndValidatePaymentMethod({
      methods,
      paymentMethodId: 'zelle',
      channel: 'whatsapp',
      settings: settingsSlice,
    });
    expect(resolved.paymentDiscountPercent).toBe(7.5);
  });

  it('efectivo sin moneda o moneda inválida → error', () => {
    const cash = normalizePaymentMethod({
      ...DEFAULT_PAYMENT_METHODS.find((m) => m.id === 'efectivo-divisas')!,
      active: true,
      discountEnabled: true,
      discountPercent: 5,
    });
    expect(() =>
      resolveAndValidatePaymentMethod({
        methods: [cash],
        paymentMethodId: 'efectivo-divisas',
        channel: 'whatsapp',
        settings: settingsSlice,
      }),
    ).toThrow(/moneda/i);
    expect(() =>
      resolveAndValidatePaymentMethod({
        methods: [cash],
        paymentMethodId: 'efectivo-divisas',
        channel: 'whatsapp',
        settings: settingsSlice,
        paymentCurrency: 'GBP',
      }),
    ).toThrow(/aceptada/i);
  });

  it('efectivo STORE_PICKUP_ONLY con MRW falla en Full; tienda ok', () => {
    const cash = normalizePaymentMethod({
      ...DEFAULT_PAYMENT_METHODS.find((m) => m.id === 'efectivo-divisas')!,
      active: true,
      fullDeliveryScope: 'STORE_PICKUP_ONLY',
    });
    expect(() =>
      resolveAndValidatePaymentMethod({
        methods: [cash],
        paymentMethodId: 'efectivo-divisas',
        channel: 'web',
        shippingMethod: 'mrw',
        paymentCurrency: 'USD',
        settings: settingsSlice,
      }),
    ).toThrow(/retiro en tienda/i);
    const ok = resolveAndValidatePaymentMethod({
      methods: [cash],
      paymentMethodId: 'efectivo-divisas',
      channel: 'web',
      shippingMethod: 'tienda',
      paymentCurrency: 'USD',
      settings: settingsSlice,
    });
    expect(ok.resolvedPaymentCurrency).toBe('USD');
  });

  it('método inexistente o inactivo falla', () => {
    expect(() =>
      resolveAndValidatePaymentMethod({
        methods: DEFAULT_PAYMENT_METHODS,
        paymentMethodId: 'no-existe',
        channel: 'web',
        settings: settingsSlice,
      }),
    ).toThrow(/no válido/i);
    const inactive = normalizePaymentMethod({
      ...DEFAULT_PAYMENT_METHODS.find((m) => m.id === 'zelle')!,
      active: false,
      recipientValue: 'x@y.com',
    });
    expect(() =>
      resolveAndValidatePaymentMethod({
        methods: [inactive],
        paymentMethodId: 'zelle',
        channel: 'web',
        settings: settingsSlice,
        paymentReference: '1',
        paymentUploadToken: 'tok',
      }),
    ).toThrow(/no está disponible/i);
  });

  it('buildCheckoutPaymentMethods solo activos y configurados', () => {
    const dto = buildCheckoutPaymentMethods(
      {
        ...settingsSlice,
        paymentMethods: DEFAULT_PAYMENT_METHODS,
      },
      'web',
    );
    expect(dto.find((m) => m.id === 'zelle')).toBeUndefined(); // inactive default
    expect(dto.find((m) => m.id === 'binancepay')).toBeTruthy();
    expect(dto.find((m) => m.id === 'cashea')).toBeTruthy();
  });

  it('applyGlobalDivisaDiscount ON 10% → elegibles 10%; Cashea/PagoMóvil 0%', () => {
    const result = applyGlobalDivisaDiscount(DEFAULT_PAYMENT_METHODS, {
      enabled: true,
      percent: 10,
    });
    for (const id of ['binancepay', 'zelle', 'efectivo-divisas'] as const) {
      const m = result.find((x) => x.id === id)!;
      expect(m.discountEligible).toBe(true);
      expect(m.discountEnabled).toBe(true);
      expect(m.discountPercent).toBe(10);
    }
    for (const id of ['cashea', 'pagomovil', 'transferencia'] as const) {
      const m = result.find((x) => x.id === id)!;
      expect(m.discountEligible).toBe(false);
      expect(m.discountEnabled).toBe(false);
      expect(m.discountPercent).toBe(0);
    }
  });

  it('19. Global ON 10%: BINANCE/ZELLE/CASH/CUSTOM = 10%', () => {
    const custom = createCustomForeignCurrencyMethod(DEFAULT_PAYMENT_METHODS);
    custom.active = false;
    custom.discountEligible = false;
    const result = applyGlobalDivisaDiscount([...DEFAULT_PAYMENT_METHODS, custom], {
      enabled: true,
      percent: 10,
    });
    for (const kind of ['BINANCE', 'ZELLE', 'CASH_FOREIGN_CURRENCY', 'CUSTOM_FOREIGN_CURRENCY'] as const) {
      const methods = result.filter((m) => m.kind === kind);
      expect(methods.length).toBeGreaterThan(0);
      for (const m of methods) {
        expect(m.discountEligible).toBe(true);
        expect(m.discountEnabled).toBe(true);
        expect(m.discountPercent).toBe(10);
      }
    }
  });

  it('20. CASHEA/PAGO_MOVIL/BANK_TRANSFER = 0%', () => {
    const result = applyGlobalDivisaDiscount(DEFAULT_PAYMENT_METHODS, {
      enabled: true,
      percent: 10,
    });
    for (const kind of ['CASHEA', 'PAGO_MOVIL', 'BANK_TRANSFER'] as const) {
      const m = result.find((x) => x.kind === kind)!;
      expect(m.discountEligible).toBe(false);
      expect(m.discountEnabled).toBe(false);
      expect(m.discountPercent).toBe(0);
    }
  });

  it('21. Divisa con discountEligible=false se normaliza a true y recibe el global', () => {
    const binance = {
      ...DEFAULT_PAYMENT_METHODS.find((m) => m.id === 'binancepay')!,
      discountEligible: false,
      discountEnabled: false,
      discountPercent: 0,
    };
    const result = applyGlobalDivisaDiscount([binance], { enabled: true, percent: 12.5 });
    expect(result[0]!.discountEligible).toBe(true);
    expect(result[0]!.discountEnabled).toBe(true);
    expect(result[0]!.discountPercent).toBe(12.5);
  });

  it('applyGlobalDivisaDiscount OFF → todos 0%', () => {
    const withPerMethod = DEFAULT_PAYMENT_METHODS.map((m) =>
      m.discountEligible
        ? { ...m, discountEnabled: true, discountPercent: 15 }
        : m,
    );
    const result = applyGlobalDivisaDiscount(withPerMethod, {
      enabled: false,
      percent: 10,
    });
    for (const m of result) {
      expect(m.discountEnabled).toBe(false);
      expect(m.discountPercent).toBe(0);
    }
  });

  it('22. Flag OFF = todos 0%', () => {
    const result = applyGlobalDivisaDiscount(DEFAULT_PAYMENT_METHODS, {
      enabled: false,
      percent: 10,
    });
    for (const m of result) {
      expect(m.discountEnabled).toBe(false);
      expect(m.discountPercent).toBe(0);
    }
  });

  it('23. Porcentajes inválidos (NaN/Infinity/>100/negativos/>2 decimales) = descuento apagado', () => {
    const invalids = [Number.NaN, Number.POSITIVE_INFINITY, 101, -1, 0, 10.123];
    for (const percent of invalids) {
      const result = applyGlobalDivisaDiscount(DEFAULT_PAYMENT_METHODS, {
        enabled: true,
        percent,
      });
      for (const m of result) {
        expect(m.discountEnabled).toBe(false);
        expect(m.discountPercent).toBe(0);
      }
    }
  });
});
