import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOMEPAGE_FREE_SHIPPING,
  DEFAULT_HOMEPAGE_SHELVES,
  homepageFreeShippingSchema,
  homepageShelvesConfigSchema,
  normalizeHomepageFreeShipping,
  normalizeHomepageShelves,
  normalizeShelfOrder,
  parseHomepageFreeShippingForSave,
  parseHomepageShelvesForSave,
} from '@/lib/homepage-config';

describe('homepage_shelves V2', () => {
  it('expone defaults V2 correctos', () => {
    expect(DEFAULT_HOMEPAGE_SHELVES.order).toEqual([
      'offers',
      'newest',
      'featured',
    ]);
    expect(DEFAULT_HOMEPAGE_SHELVES.shelves.offers.title).toBe('Ofertas del Día');
    expect(DEFAULT_HOMEPAGE_SHELVES.shelves.newest.badge).toBe('Recién llegados');
    expect(DEFAULT_HOMEPAGE_SHELVES.shelves.featured.badge).toBe('Destacados');
    expect(DEFAULT_HOMEPAGE_SHELVES.featuredProductIds).toEqual([]);
  });

  it('lee configuración V2 válida', () => {
    const raw = {
      order: ['featured', 'offers', 'newest'],
      shelves: {
        offers: {
          enabled: false,
          title: 'Ofertas',
          badge: 'Hot',
          subtitle: 'Hoy',
        },
        newest: {
          enabled: true,
          title: 'Nuevos',
          badge: 'New',
          subtitle: '',
        },
        featured: {
          enabled: true,
          title: 'Pick',
          badge: 'Top',
          subtitle: 'Team',
        },
      },
      featuredProductIds: ['a', 'b'],
    };
    const normalized = normalizeHomepageShelves(raw);
    expect(normalized.order).toEqual(['featured', 'offers', 'newest']);
    expect(normalized.shelves.offers.enabled).toBe(false);
    expect(normalized.featuredProductIds).toEqual(['a', 'b']);
    expect(homepageShelvesConfigSchema.safeParse(normalized).success).toBe(true);
  });

  it('migra en memoria la configuración antigua', () => {
    const legacy = {
      bestsellers: {
        title: 'Más vendidos X',
        badge: 'Top',
        subtitle: 'sub',
      },
      newest: {
        title: 'Novedades custom',
        badge: 'Fresh',
        subtitle: 'llegaron',
      },
      recommended: {
        title: 'Reco title',
        badge: 'Reco',
        subtitle: 'equipo',
      },
    };
    const normalized = normalizeHomepageShelves(legacy);
    expect(normalized.order).toEqual(['offers', 'newest', 'featured']);
    expect(normalized.shelves.newest.title).toBe('Novedades custom');
    expect(normalized.shelves.newest.badge).toBe('Fresh');
    expect(normalized.shelves.newest.subtitle).toBe('llegaron');
    expect(normalized.shelves.featured.title).toBe('Reco title');
    expect(normalized.shelves.featured.badge).toBe('Reco');
    expect(normalized.shelves.offers.title).toBe(
      DEFAULT_HOMEPAGE_SHELVES.shelves.offers.title,
    );
    expect(normalized.featuredProductIds).toEqual([]);
  });

  it('normaliza order sin duplicados y completa faltantes', () => {
    expect(normalizeShelfOrder(['newest', 'newest', 'offers'])).toEqual([
      'newest',
      'offers',
      'featured',
    ]);
    expect(normalizeShelfOrder(['unknown', 'featured'])).toEqual([
      'featured',
      'offers',
      'newest',
    ]);
  });

  it('rechaza claves inválidas en save', () => {
    const parsed = parseHomepageShelvesForSave({
      order: ['offers', 'bogus'],
      shelves: DEFAULT_HOMEPAGE_SHELVES.shelves,
      featuredProductIds: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza más de 8 featuredProductIds', () => {
    const ids = Array.from({ length: 9 }, (_, i) => `id-${i}`);
    const parsed = parseHomepageShelvesForSave({
      ...DEFAULT_HOMEPAGE_SHELVES,
      featuredProductIds: ids,
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza IDs destacados duplicados', () => {
    const parsed = parseHomepageShelvesForSave({
      ...DEFAULT_HOMEPAGE_SHELVES,
      featuredProductIds: ['a', 'a'],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza título vacío al guardar V2', () => {
    const parsed = parseHomepageShelvesForSave({
      ...DEFAULT_HOMEPAGE_SHELVES,
      shelves: {
        ...DEFAULT_HOMEPAGE_SHELVES.shelves,
        offers: {
          ...DEFAULT_HOMEPAGE_SHELVES.shelves.offers,
          title: '   ',
        },
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('homepage_free_shipping', () => {
  it('default válido', () => {
    expect(DEFAULT_HOMEPAGE_FREE_SHIPPING).toEqual({
      enabled: true,
      text: 'Envío gratis por MRW',
    });
    expect(
      homepageFreeShippingSchema.safeParse(DEFAULT_HOMEPAGE_FREE_SHIPPING)
        .success,
    ).toBe(true);
  });

  it('rechaza texto vacío', () => {
    expect(
      parseHomepageFreeShippingForSave({ enabled: true, text: '  ' }).success,
    ).toBe(false);
  });

  it('rechaza propiedades desconocidas', () => {
    expect(
      homepageFreeShippingSchema.safeParse({
        enabled: true,
        text: 'Envío gratis por MRW',
        extra: true,
      }).success,
    ).toBe(false);
  });

  it('normaliza lectura parcial', () => {
    expect(normalizeHomepageFreeShipping({ enabled: false })).toEqual({
      enabled: false,
      text: 'Envío gratis por MRW',
    });
  });
});
