import { describe, expect, it } from 'vitest';
import {
  buildCatalogHref,
  hasActiveCatalogFilters,
  normalizeSearchText,
  parseProductQuery,
  sanitizePriceRange,
} from '@/lib/products/filter';

describe('normalizeSearchText', () => {
  it('ignora acentos y mayúsculas', () => {
    expect(normalizeSearchText('Teléfono')).toBe('telefono');
    expect(normalizeSearchText('TELEFONO')).toBe('telefono');
    expect(normalizeSearchText('  Cámara  ')).toBe('camara');
  });
});

describe('sanitizePriceRange', () => {
  it('intercambia min y max invertidos', () => {
    expect(sanitizePriceRange(100, 20)).toEqual({ minPrice: 20, maxPrice: 100 });
  });

  it('acepta un solo extremo', () => {
    expect(sanitizePriceRange(50, undefined)).toEqual({ minPrice: 50, maxPrice: undefined });
  });
});

describe('parseProductQuery', () => {
  it('parsea filtros combinados desde URL', () => {
    const q = parseProductQuery({
      q: 'laptop',
      cat: 'Computación',
      brand: 'Lenovo',
      minPrice: '10',
      maxPrice: '500',
      sort: 'price-asc',
      page: '2',
    });

    expect(q.q).toBe('laptop');
    expect(q.category).toBe('Computación');
    expect(q.brand).toBe('Lenovo');
    expect(q.minPrice).toBe(10);
    expect(q.maxPrice).toBe(500);
    expect(q.sort).toBe('price-asc');
    expect(q.page).toBe(2);
  });

  it('descarta precios inválidos', () => {
    const q = parseProductQuery({ minPrice: 'abc', maxPrice: '-5' });
    expect(q.minPrice).toBeUndefined();
    expect(q.maxPrice).toBeUndefined();
  });

  it('acepta alias subcategory → brand', () => {
    const q = parseProductQuery({ subcategory: 'Samsung' });
    expect(q.brand).toBe('Samsung');
  });
});

describe('hasActiveCatalogFilters', () => {
  it('detecta búsqueda y filtros', () => {
    expect(hasActiveCatalogFilters(parseProductQuery({ q: 'mouse' }))).toBe(true);
    expect(hasActiveCatalogFilters(parseProductQuery({ cat: 'Audio' }))).toBe(true);
    expect(hasActiveCatalogFilters(parseProductQuery({}))).toBe(false);
    expect(hasActiveCatalogFilters(parseProductQuery({ sort: 'newest' }))).toBe(false);
    expect(hasActiveCatalogFilters(parseProductQuery({ sort: 'price-desc' }))).toBe(true);
  });
});

describe('buildCatalogHref', () => {
  it('genera URL compartible con filtros', () => {
    const href = buildCatalogHref('/productos', {
      q: 'teléfono',
      cat: 'Celulares',
      sort: 'price-asc',
      page: 2,
    });
    expect(href).toContain('q=tel');
    expect(href).toContain('cat=Celulares');
    expect(href).toContain('sort=price-asc');
    expect(href).toContain('page=2');
  });
});
