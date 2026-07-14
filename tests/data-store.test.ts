import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  hasConfiguredPayments,
  isPagoMovilConfigured,
  isTransferenciaConfigured,
  storeSettingsSchema,
} from '@/lib/data-store';

describe('DEFAULT_SETTINGS (PRD-101)', () => {
  it('no contiene datos bancarios ficticios', () => {
    expect(DEFAULT_SETTINGS.pagoMovil.bank).toBe('');
    expect(DEFAULT_SETTINGS.pagoMovil.idNumber).toBe('');
    expect(DEFAULT_SETTINGS.transferencia.accountNumber).toBe('');
    expect(DEFAULT_SETTINGS.transferencia.rif).toBe('');
    // Regresión explícita: los placeholders históricos no deben volver
    const json = JSON.stringify(DEFAULT_SETTINGS);
    expect(json).not.toContain('12.345.678');
    expect(json).not.toContain('1234567890');
    expect(json).not.toContain('J-12345678-9');
  });

  it('hasConfiguredPayments es false para los defaults', () => {
    expect(hasConfiguredPayments(DEFAULT_SETTINGS)).toBe(false);
  });

  it('hasConfiguredPayments es true con un método completo', () => {
    expect(
      hasConfiguredPayments({
        ...DEFAULT_SETTINGS,
        pagoMovil: { bank: 'Banesco', phone: '0414-0000000', idNumber: 'V-1.111.111' },
      }),
    ).toBe(true);
  });
});

describe('isPagoMovilConfigured / isTransferenciaConfigured', () => {
  it('ambos son false para los defaults (bancos vacíos)', () => {
    expect(isPagoMovilConfigured(DEFAULT_SETTINGS)).toBe(false);
    expect(isTransferenciaConfigured(DEFAULT_SETTINGS)).toBe(false);
  });

  it('isPagoMovilConfigured es true solo cuando Pago Móvil está completo', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      pagoMovil: { bank: 'Banesco', phone: '0414-0000000', idNumber: 'V-1.111.111' },
    };
    expect(isPagoMovilConfigured(settings)).toBe(true);
    expect(isTransferenciaConfigured(settings)).toBe(false);
  });

  it('isTransferenciaConfigured es true solo cuando Transferencia está completa', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      transferencia: {
        bank: 'Mercantil',
        accountNumber: '0105-1234-56-7890123456',
        accountHolder: 'MundoTech C.A.',
        rif: 'J-00000000-0',
      },
    };
    expect(isPagoMovilConfigured(settings)).toBe(false);
    expect(isTransferenciaConfigured(settings)).toBe(true);
  });

  it('hasConfiguredPayments compone ambos helpers (OR)', () => {
    const onlyPagoMovil = {
      ...DEFAULT_SETTINGS,
      pagoMovil: { bank: 'Banesco', phone: '0414-0000000', idNumber: 'V-1.111.111' },
    };
    expect(hasConfiguredPayments(onlyPagoMovil)).toBe(
      isPagoMovilConfigured(onlyPagoMovil) || isTransferenciaConfigured(onlyPagoMovil),
    );
  });
});

describe('storeSettingsSchema.whatsappOrderPhone', () => {
  it('acepta vacío (el modo no se evalúa en settings)', () => {
    const result = storeSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, whatsappOrderPhone: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.whatsappOrderPhone).toBe('');
  });

  it('normaliza y acepta un número venezolano válido con símbolos', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      whatsappOrderPhone: '+58 412-147-1338',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.whatsappOrderPhone).toBe('584121471338');
  });

  it('rechaza un número local sin prefijo de país', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      whatsappOrderPhone: '0412-1471338',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza letras mezcladas que no dejan suficientes dígitos tras normalizar', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      whatsappOrderPhone: '58-telefono',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza menos de 10 dígitos', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      whatsappOrderPhone: '581234567',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza más de 15 dígitos', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      whatsappOrderPhone: '5841214713381234',
    });
    expect(result.success).toBe(false);
  });
});

describe('storeSettingsSchema', () => {
  it('acepta settings con TODOS los datos bancarios vacíos (estado tienda recién instalada)', () => {
    const result = storeSettingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(result.success).toBe(true);
  });

  it('acepta settings completos', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      pagoMovil: { bank: 'Banesco', phone: '0414-0000000', idNumber: 'V-1.111.111' },
      transferencia: {
        bank: 'Mercantil',
        accountNumber: '0105-1234-56-7890123456',
        accountHolder: 'MundoTech C.A.',
        rif: 'J-00000000-0',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rechaza Pago Móvil llenado a medias (todo-o-nada)', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      pagoMovil: { bank: 'Banesco', phone: '', idNumber: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza Transferencia llenada a medias (todo-o-nada)', () => {
    const result = storeSettingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      transferencia: { bank: 'Mercantil', accountNumber: '', accountHolder: '', rif: '' },
    });
    expect(result.success).toBe(false);
  });
});
