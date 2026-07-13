/**
 * SESIÓN 14 — Tests para las consultas acotadas de home.
 *
 * Verifica que cada shelf function use take/select/where correctos,
 * y que los edge cases (0, 3, 1000, inactivos, agotados, duplicados)
 * se manejen sin errores. No usa snapshots.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
  },
}));

// Aseguramos que unstable_cache devuelva la función original en tests.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock de server-only que Next.js usa para marcar módulos server-side.
vi.mock('server-only', () => ({}));

// Forzamos el reset de módulos para que home-cache se re-importe
// con los mocks ya activos.
vi.resetModules();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Crea un mock de producto Prisma con Decimal simulado. */
function mockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-default',
    slug: 'producto-default',
    name: 'Producto Default',
    description: 'Descripción genérica',
    price: new Prisma.Decimal(50.0),
    originalPrice: null,
    stock: 10,
    category: 'Tecnología',
    brand: 'MundoTech',
    images: ['/images/default.jpg'],
    ...overrides,
  };
}

/** Crea un producto en oferta (con originalPrice > price). */
function mockOfferProduct(id: string, price: number, originalPrice: number) {
  return mockProduct({
    id,
    slug: `oferta-${id}`,
    name: `Oferta ${id}`,
    price: new Prisma.Decimal(price),
    originalPrice: new Prisma.Decimal(originalPrice),
  });
}

/** Crea un producto de gaming. */
function mockGamingProduct(id: string) {
  return mockProduct({
    id,
    slug: `gaming-${id}`,
    name: `Consola Gaming ${id}`,
    category: 'Consolas y Gaming',
    price: new Prisma.Decimal(100),
    originalPrice: null,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getCachedNewestProducts (SESIÓN 14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa take=8, where.isActive=true, select PRODUCT_CARD_SELECT, orderBy createdAt desc', async () => {
    const mockRows = Array.from({ length: 5 }, (_, i) => mockProduct({ id: `new-${i}` }));
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockRows as never);

    const { getCachedNewestProducts } = await import('@/lib/home-cache');
    const result = await getCachedNewestProducts();

    expect(vi.mocked(prisma.product.findMany)).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0];
    expect(call).toBeDefined();
    const params = call as {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
      select?: Record<string, unknown>;
    };
    expect(params.where).toEqual({ isActive: true });
    expect(params.orderBy).toEqual({ createdAt: 'desc' });
    expect(params.take).toBe(8);
    expect(params.select).toBeDefined();
    // Verifica que tiene los campos mínimos de PRODUCT_CARD_SELECT
    expect(params.select).toHaveProperty('id', true);
    expect(params.select).toHaveProperty('name', true);
    expect(params.select).toHaveProperty('price', true);
    expect(result).toHaveLength(5);
  });

  it('retorna array vacío si no hay productos activos', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const { getCachedNewestProducts } = await import('@/lib/home-cache');
    const result = await getCachedNewestProducts();
    expect(result).toEqual([]);
  });

  it('pasa take=8 a Prisma aunque haya 1000 productos', async () => {
    // El mock devuelve 1000 registros (ignora take), pero el test verifica
    // que la consulta envíe take=8 a Prisma.
    const mockRows = Array.from({ length: 1000 }, (_, i) =>
      mockProduct({ id: `bulk-${i}`, name: `Producto ${i}` }),
    );
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockRows as never);

    const { getCachedNewestProducts } = await import('@/lib/home-cache');
    await getCachedNewestProducts();

    const params = vi.mocked(prisma.product.findMany).mock.calls[0][0] as {
      take?: number;
    };
    expect(params.take).toBe(8);
  });

  it('no incluye productos inactivos (where.isActive=true)', async () => {
    // El mock devuelve solo activos; si la consulta pidiera isActive=false
    // el test fallaría porque el where correcto filtra inactivos.
    let passedActiveCheck = false;
    vi.mocked(prisma.product.findMany).mockImplementation(
      ((args?: unknown) => {
        const params = args as { where?: { isActive?: boolean } };
        if (params?.where?.isActive === true) passedActiveCheck = true;
        return Promise.resolve([]) as never;
      }) as typeof prisma.product.findMany,
    );

    const { getCachedNewestProducts } = await import('@/lib/home-cache');
    await getCachedNewestProducts();
    expect(passedActiveCheck).toBe(true);
  });

  it('productos con stock 0 sí se incluyen', async () => {
    const rows = [
      mockProduct({ id: 'a', stock: 0 }),
      mockProduct({ id: 'b', stock: 5 }),
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(rows as never);

    const { getCachedNewestProducts } = await import('@/lib/home-cache');
    const result = await getCachedNewestProducts();
    expect(result).toHaveLength(2);
    expect(result.find((p: { id: string }) => p.id === 'a')?.stock).toBe(0);
  });

  it('convierte Decimal a number correctamente', async () => {
    const rows = [mockProduct({ id: 'dec-test', price: new Prisma.Decimal(99.99) })];
    vi.mocked(prisma.product.findMany).mockResolvedValue(rows as never);

    const { getCachedNewestProducts } = await import('@/lib/home-cache');
    const result = await getCachedNewestProducts();
    expect(result[0].price).toBe(99.99);
  });
});

describe('getCachedFlashDeals (SESIÓN 14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa take=24, where con isActive=true y originalPrice not null', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const { getCachedFlashDeals } = await import('@/lib/home-cache');
    await getCachedFlashDeals();

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0];
    const params = call as {
      where?: Record<string, unknown>;
      take?: number;
    };
    expect(params.take).toBe(24);
    expect(params.where).toEqual({
      isActive: true,
      originalPrice: { not: null },
    });
  });

  it('retorna solo los que tienen rebaja (originalPrice > price)', async () => {
    const rows = [
      mockOfferProduct('a', 30, 50),   // rebaja
      mockOfferProduct('b', 50, 50),   // igual, sin rebaja
      mockOfferProduct('c', 10, 20),   // rebaja
      mockOfferProduct('d', 80, 60),   // original < price, sin rebaja
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(rows as never);

    const { getCachedFlashDeals } = await import('@/lib/home-cache');
    const result = await getCachedFlashDeals();
    expect(result).toHaveLength(2);
    expect(result.map((p: { id: string }) => p.id).sort()).toEqual(['a', 'c']);
  });

  it('retorna máximo 10 ofertas aunque haya muchas', async () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      mockOfferProduct(`offer-${i}`, 10, 30 + i),
    );
    vi.mocked(prisma.product.findMany).mockResolvedValue(rows as never);

    const { getCachedFlashDeals } = await import('@/lib/home-cache');
    const result = await getCachedFlashDeals();
    expect(result).toHaveLength(10);
  });

  it('retorna array vacío si ningún producto tiene rebaja', async () => {
    const rows = [
      mockOfferProduct('a', 50, 50),
      mockOfferProduct('b', 30, 20),  // original < price
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(rows as never);

    const { getCachedFlashDeals } = await import('@/lib/home-cache');
    const result = await getCachedFlashDeals();
    expect(result).toEqual([]);
  });

  it('retorna array vacío si no hay productos con originalPrice', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const { getCachedFlashDeals } = await import('@/lib/home-cache');
    const result = await getCachedFlashDeals();
    expect(result).toEqual([]);
  });
});

describe('getCachedGamingProducts (SESIÓN 14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa take=8, where con isActive y OR insensible en category/name/brand', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const { getCachedGamingProducts } = await import('@/lib/home-cache');
    await getCachedGamingProducts();

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0];
    const params = call as {
      where?: { isActive?: boolean; OR?: Array<Record<string, unknown>> };
      take?: number;
      orderBy?: unknown;
    };
    expect(params.take).toBe(8);
    expect(params.orderBy).toEqual({ createdAt: 'desc' });
    expect(params.where?.isActive).toBe(true);
    expect(params.where?.OR).toBeDefined();
    expect(params.where!.OR!.length).toBeGreaterThan(0);

    const firstOr = params.where!.OR![0];
    expect(firstOr).toHaveProperty('category');
    expect(firstOr.category).toEqual(
      expect.objectContaining({ contains: expect.any(String), mode: 'insensitive' }),
    );
  });

  it('buildGamingProductsWhere incluye OR para category, name y brand', async () => {
    const { buildGamingProductsWhere, GAMING_KEYWORDS } = await import('@/lib/home-cache');
    const where = buildGamingProductsWhere();

    expect(where.isActive).toBe(true);
    expect(where.OR).toHaveLength(GAMING_KEYWORDS.length * 3);

    const fields = new Set(
      where.OR.map((clause) => Object.keys(clause)[0]),
    );
    expect(fields).toEqual(new Set(['category', 'name', 'brand']));
  });

  it('un producto antiguo que coincide puede aparecer (sin filtro en memoria)', async () => {
    const oldGaming = mockProduct({
      id: 'legacy-ps2',
      name: 'PlayStation 2 Slim',
      category: 'Retro',
      brand: 'Sony',
    });
    vi.mocked(prisma.product.findMany).mockResolvedValue([oldGaming] as never);

    const { getCachedGamingProducts } = await import('@/lib/home-cache');
    const result = await getCachedGamingProducts();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('legacy-ps2');
    expect(vi.mocked(prisma.product.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, OR: expect.any(Array) }),
        take: 8,
      }),
    );
  });

  it('retorna hasta 8 productos devueltos por Prisma', async () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      mockGamingProduct(`g-${i}`),
    );
    vi.mocked(prisma.product.findMany).mockResolvedValue(rows as never);

    const { getCachedGamingProducts } = await import('@/lib/home-cache');
    const result = await getCachedGamingProducts();
    expect(result).toHaveLength(8);
  });

  it('retorna array vacío si Prisma no encuentra coincidencias', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const { getCachedGamingProducts } = await import('@/lib/home-cache');
    const result = await getCachedGamingProducts();
    expect(result).toEqual([]);
  });

  it('no incluye productos inactivos (where.isActive=true)', async () => {
    let passedActiveCheck = false;
    vi.mocked(prisma.product.findMany).mockImplementation(
      ((args?: unknown) => {
        const params = args as { where?: { isActive?: boolean } };
        if (params?.where?.isActive === true) passedActiveCheck = true;
        return Promise.resolve([]) as never;
      }) as typeof prisma.product.findMany,
    );

    const { getCachedGamingProducts } = await import('@/lib/home-cache');
    await getCachedGamingProducts();
    expect(passedActiveCheck).toBe(true);
  });
});
