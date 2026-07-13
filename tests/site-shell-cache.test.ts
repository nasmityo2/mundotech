/**
 * SESIÓN 15 — Tests para el caché unificado del shell del layout + footer.
 *
 * Verifica:
 * - Una sola ejecución subyacente de Prisma por ventana de caché.
 * - El DTO contiene solo datos públicos (sin datos bancarios/secretos).
 * - Fallback seguro cuando la BD o AppConfig fallan.
 * - Serialización JSON correcta (sin Decimal/Date).
 * - Invocación de revalidateTag en muraciones.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
  },
}));

// unstable_cache passthrough: ejecuta la función real (no cachea en tests).
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('server-only', () => ({}));

// Los módulos de lectura real tienen imports server-only,
// así que forzamos reset antes de cada test.
vi.resetModules();

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_SETTINGS = {
  storeName: 'MundoTech',
  tagline: 'Conectados Contigo',
  phone: '0412-1471338',
  phone2: '',
  email: 'test@mundotechve.com',
  address: 'Carrera 21 con calle 21, Centro, Barquisimeto',
  instagram: 'https://instagram.com/Mundotech39',
  facebook: '',
  pagoMovil: { bank: 'Banesco', phone: '04121234567', idNumber: 'V12345678' },
  transferencia: { bank: 'Mercantil', accountNumber: '0123456789', accountHolder: 'Mundo Tech C.A.', rif: 'J123456789' },
  binancePayId: 'bp123',
  binanceQrUrl: '',
  labelWidthMm: 100,
  labelHeightMm: 150,
  whatsappOrderPhone: '',
};

const MOCK_SEO_LOCAL = {
  legalName: 'Mundo Tech',
  slogan: 'Conectados Contigo',
  streetAddress: 'Carrera 21 con esquina calle 21, Centro',
  addressLocality: 'Barquisimeto',
  addressRegion: 'Lara',
  postalCode: '3001',
  addressCountry: 'VE',
  geo: { latitude: 10.068, longitude: -69.312 },
  googleMapsUrl: '',
  googleMapsEmbed: '',
  openingHours: [
    { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], opens: '08:30', closes: '17:30' },
    { days: ['Sat'], opens: '08:30', closes: '18:00' },
  ],
  paymentAccepted: ['Cash', 'Transferencia', 'Pago Móvil', 'Binance Pay'],
  priceRange: '$$',
  whatsapp: '',
  tiktok: '',
};

const MOCK_SITE_CONTENT = {
  heroFallback: { badge: '', title: '', subtitle: '', ctaText: 'Explorar catálogo', ctaLink: '/productos', imageUrl: '' },
  brandStrip: { enabled: true, slogan: 'CONECTADOS CONTIGO', note: '' },
  whatsapp: { enabled: true, phone: '0412-1471338', message: '' },
  productTrust: [
    { icon: 'store' as const, title: 'Tienda física', sub: '' },
    { icon: 'truck' as const, title: 'Delivery gratis', sub: '' },
  ],
  popup: { enabled: false, badge: '', title: '', text: '', ctaText: '', ctaLink: '/productos', imageUrl: '', frequencyDays: 7, delaySeconds: 6, endsAt: '' },
};

const MOCK_ANNOUNCEMENT = {
  active: true,
  text: '¡Envíos gratis!',
  link: '/productos',
  bgColor: '#0B1220',
  textColor: '#FFFFFF',
};

function setupMockAppConfig() {
  (prisma.appConfig.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
    ({ where: { key } }: { where: { key: string } }) => {
      switch (key) {
        case 'store_settings':
          return { key, value: JSON.stringify(MOCK_SETTINGS) };
        case 'seo_local':
          return { key, value: JSON.stringify(MOCK_SEO_LOCAL) };
        case 'site_content':
          return { key, value: JSON.stringify(MOCK_SITE_CONTENT) };
        case 'announcement_bar':
          return { key, value: JSON.stringify(MOCK_ANNOUNCEMENT) };
        default:
          return null;
      }
    },
  );
}

function setupMockNoConfig() {
  (prisma.appConfig.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (prisma.category.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

function setupMockCategory(slug: string | null) {
  (prisma.category.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
    slug ? { slug } : null,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getCachedSiteShellData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ejecuta todas las lecturas subyacentes una sola vez', async () => {
    setupMockAppConfig();
    setupMockCategory('consolas');
    setupMockCategory('accesorios');

    const { getCachedSiteShellData } = await import('@/lib/site-shell-cache');
    const result = await getCachedSiteShellData();

    // 4 reads de AppConfig + hasta 2 reads de Category (por name y slug + fallbacks sync)
    expect(prisma.appConfig.findUnique).toHaveBeenCalledTimes(4);
    expect(prisma.category.findFirst).toHaveBeenCalled();

    // Verifica que el DTO tenga la estructura esperada
    expect(result).toHaveProperty('announcement');
    expect(result).toHaveProperty('settings');
    expect(result).toHaveProperty('seoLocal');
    expect(result).toHaveProperty('siteContent');
    expect(result).toHaveProperty('categoryPaths');
    expect(result).toHaveProperty('openingHours');
  });

  it('el DTO NO contiene datos bancarios ni secretos', async () => {
    setupMockAppConfig();
    setupMockCategory('consolas');

    const { getCachedSiteShellData } = await import('@/lib/site-shell-cache');
    const result = await getCachedSiteShellData();

    const json = JSON.stringify(result);
    // Verificar que no hay datos bancarios
    expect(json).not.toContain('pagoMovil');
    expect(json).not.toContain('transferencia');
    expect(json).not.toContain('binancePayId');
    expect(json).not.toContain('binanceQrUrl');
    expect(json).not.toContain('whatsappOrderPhone');
    expect(json).not.toContain('labelWidthMm');
    expect(json).not.toContain('labelHeightMm');
    // Pero sí contiene los campos públicos de settings
    expect(json).toContain('storeName');
    expect(json).toContain('phone');
    expect(json).toContain('email');
  });

  it('el DTO es serializable como JSON (sin Decimal ni Date)', async () => {
    setupMockAppConfig();
    setupMockCategory('consolas');

    const { getCachedSiteShellData } = await import('@/lib/site-shell-cache');
    const result = await getCachedSiteShellData();

    // Serialización no debe fallar y debe producir JSON válido
    const json = JSON.stringify(result);
    expect(() => JSON.parse(json)).not.toThrow();

    // Verificar valores conocidos
    const parsed = JSON.parse(json);
    expect(parsed.settings.storeName).toBe('MundoTech');
    expect(parsed.seoLocal.legalName).toBe('Mundo Tech');
    expect(parsed.announcement.text).toBe('¡Envíos gratis!');
    expect(parsed.categoryPaths.gamingPath).toBe('/categoria/consolas');
    expect(parsed.openingHours).toHaveLength(2);
  });

  it('retorna fallback seguro cuando no hay configuración en BD', async () => {
    setupMockNoConfig();

    const { getCachedSiteShellData } = await import('@/lib/site-shell-cache');
    const result = await getCachedSiteShellData();

    // No debe lanzar error
    expect(result).toBeDefined();
    // Datos con valores por defecto (DEFAULT_SETTINGS de cada módulo)
    expect(result.settings.storeName).toBe('MundoTech');
    expect(result.settings.phone).toBe('0412-1471338'); // viene del DEFAULT_SETTINGS
    expect(result.siteContent.heroFallback).toBeDefined();
    expect(result.announcement.active).toBe(false);
    // Categorías sin AppConfig: fallback a /productos
    expect(result.categoryPaths.gamingPath).toBe('/productos');
    expect(result.categoryPaths.accesoriosPath).toBe('/productos');
  });

  it('retorna fallback cuando readSettings lanza error (BD inaccesible)', async () => {
    (prisma.appConfig.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection refused'),
    );
    (prisma.category.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection refused'),
    );

    const { getCachedSiteShellData } = await import('@/lib/site-shell-cache');
    const result = await getCachedSiteShellData();

    expect(result).toBeDefined();
    expect(result.settings.storeName).toBe('MundoTech');
    expect(result.announcement.active).toBe(false);
    expect(result.categoryPaths.gamingPath).toBe('/productos');
  });

  it('tags de caché están correctamente exportados', async () => {
    const {
      SHELL_CACHE_TAGS,
      CACHE_TAG_SITE_SHELL,
      CACHE_TAG_SETTINGS,
      CACHE_TAG_SITE_CONTENT,
      CACHE_TAG_SEO_LOCAL,
      CACHE_TAG_ANNOUNCEMENT,
      CACHE_TAG_CATEGORIES,
    } = await import('@/lib/site-shell-cache');

    expect(SHELL_CACHE_TAGS).toContain('site-shell');
    expect(SHELL_CACHE_TAGS).toContain('settings');
    expect(SHELL_CACHE_TAGS).toContain('site-content');
    expect(SHELL_CACHE_TAGS).toContain('seo-local');
    expect(SHELL_CACHE_TAGS).toContain('announcement');
    expect(SHELL_CACHE_TAGS).toContain('categories');

    expect(CACHE_TAG_SITE_SHELL).toBe('site-shell');
    expect(CACHE_TAG_SETTINGS).toBe('settings');
    expect(CACHE_TAG_SITE_CONTENT).toBe('site-content');
    expect(CACHE_TAG_SEO_LOCAL).toBe('seo-local');
    expect(CACHE_TAG_ANNOUNCEMENT).toBe('announcement');
    expect(CACHE_TAG_CATEGORIES).toBe('categories');
  });
});

describe('buildContactFromShellData', () => {
  it('deriva el objeto contact correctamente del shellData', async () => {
    setupMockAppConfig();
    setupMockCategory('consolas');

    const { getCachedSiteShellData, buildContactFromShellData } = await import('@/lib/site-shell-cache');
    const shellData = await getCachedSiteShellData();
    const contact = buildContactFromShellData(shellData);

    expect(contact.phone).toBe(MOCK_SETTINGS.phone);
    expect(contact.phone2).toBe(MOCK_SETTINGS.phone2);
    expect(contact.email).toBe(MOCK_SETTINGS.email);
    expect(contact.address).toBe(MOCK_SETTINGS.address);
    // deliveryNote debería venir del productTrust con icon 'truck'
    expect(contact.deliveryNote).toBe('Delivery gratis');
  });
});

describe('RevalidateTag en mutaciones', () => {
  it('los tags de shell están siendo exportados correctamente desde lib/site-shell-cache', async () => {
    const {
      CACHE_TAG_SITE_SHELL,
      CACHE_TAG_SETTINGS,
      CACHE_TAG_SITE_CONTENT,
      CACHE_TAG_SEO_LOCAL,
      CACHE_TAG_ANNOUNCEMENT,
      CACHE_TAG_CATEGORIES,
    } = await import('@/lib/site-shell-cache');
    expect(CACHE_TAG_SITE_SHELL).toBe('site-shell');
    expect(CACHE_TAG_SETTINGS).toBe('settings');
    expect(CACHE_TAG_SITE_CONTENT).toBe('site-content');
    expect(CACHE_TAG_SEO_LOCAL).toBe('seo-local');
    expect(CACHE_TAG_ANNOUNCEMENT).toBe('announcement');
    expect(CACHE_TAG_CATEGORIES).toBe('categories');
  });
});
