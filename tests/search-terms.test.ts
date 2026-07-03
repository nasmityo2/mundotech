import { describe, expect, it } from 'vitest';
import { searchTermsFrom } from '@/lib/products/query-products';

/**
 * FASE 4.3 (MEJORA 1.4): tokenización de la búsqueda tolerante a errores.
 * El matching real (unaccent + word_similarity) vive en Postgres; aquí se
 * cubre la lógica pura de tokenización que arma el WHERE por palabra.
 */
describe('searchTermsFrom', () => {
  it('separa por espacios y conserva palabras de 2+ caracteres', () => {
    expect(searchTermsFrom('casco moto')).toEqual(['casco', 'moto']);
  });

  it('descarta palabras de 1 carácter (LIKE %a% matchearía todo)', () => {
    expect(searchTermsFrom('a casco y moto')).toEqual(['casco', 'moto']);
  });

  it('colapsa espacios múltiples y bordes', () => {
    expect(searchTermsFrom('  audífonos   bluetooth  ')).toEqual(['audífonos', 'bluetooth']);
  });

  it('acota a máximo 6 palabras', () => {
    expect(searchTermsFrom('uno dos tres cuatro cinco seis siete ocho')).toHaveLength(6);
  });

  it('devuelve [] para consultas vacías o de solo 1 carácter', () => {
    expect(searchTermsFrom('')).toEqual([]);
    expect(searchTermsFrom('a')).toEqual([]);
    expect(searchTermsFrom('   ')).toEqual([]);
  });
});
