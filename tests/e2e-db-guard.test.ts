import { describe, expect, it } from 'vitest';
import { validateE2eDatabaseUrl } from '@/lib/e2e-db-guard';

describe('validateE2eDatabaseUrl', () => {
  it('acepta BD con sufijo _e2e', () => {
    expect(
      validateE2eDatabaseUrl('postgresql://ci:ci@localhost:5432/mundotech_e2e'),
    ).toEqual({ ok: true });
  });

  it('acepta BD con "test" en el nombre', () => {
    expect(
      validateE2eDatabaseUrl('postgresql://ci:ci@localhost:5432/mundotech_test'),
    ).toEqual({ ok: true });
  });

  it('rechaza URL vacía', () => {
    const result = validateE2eDatabaseUrl('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('no está configurada');
    }
  });

  it('rechaza URL malformada', () => {
    const result = validateE2eDatabaseUrl('not-a-valid-url');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('no es una URL válida');
    }
  });

  it('rechaza producción aunque CI=true', () => {
    const prevCi = process.env.CI;
    process.env.CI = 'true';
    try {
      const result = validateE2eDatabaseUrl(
        'postgresql://app:secret@db.mundotechve.com:5432/mundotech_production',
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).not.toMatch(/secret|mundotechve|postgresql/i);
        expect(result.reason).toContain('_e2e');
      }
    } finally {
      if (prevCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = prevCi;
      }
    }
  });

  it('no incluye credenciales ni host en el mensaje de error', () => {
    const result = validateE2eDatabaseUrl(
      'postgresql://superuser:MyP@ssw0rd!@prod.internal:5432/production',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toMatch(/superuser|MyP@ssw0rd|prod\.internal/i);
    }
  });
});
