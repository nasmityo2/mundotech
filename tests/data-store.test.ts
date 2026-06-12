import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  hasConfiguredPayments,
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

describe('storeSettingsSchema', () => {
  it('rechaza guardar settings con datos bancarios vacíos (el admin no puede persistir placeholders)', () => {
    const result = storeSettingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(result.success).toBe(false);
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
});
