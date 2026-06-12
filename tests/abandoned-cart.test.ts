import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashRecoveryToken, parseAbandonedCartItems } from '@/lib/abandoned-cart';

describe('hashRecoveryToken (PRD-178)', () => {
  it('produce SHA-256 hex determinista (mismo algoritmo que la migración SQL)', () => {
    const token = 'token-de-prueba';
    const expected = createHash('sha256').update(token).digest('hex');
    expect(hashRecoveryToken(token)).toBe(expected);
    expect(hashRecoveryToken(token)).toHaveLength(64);
  });

  it('tokens distintos producen hashes distintos', () => {
    expect(hashRecoveryToken('a')).not.toBe(hashRecoveryToken('b'));
  });
});

describe('parseAbandonedCartItems', () => {
  it('filtra entradas malformadas sin romper', () => {
    const raw = [
      { id: '1', name: 'Producto', slug: 'producto', price: 10, quantity: 2, image: null },
      { id: 2, name: 'inválido: id numérico' },
      'no-es-objeto',
      null,
    ];
    const items = parseAbandonedCartItems(raw);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('1');
  });

  it('devuelve [] para valores no-array', () => {
    expect(parseAbandonedCartItems(null)).toEqual([]);
    expect(parseAbandonedCartItems({})).toEqual([]);
  });
});
