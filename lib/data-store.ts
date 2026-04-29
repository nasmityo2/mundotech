/**
 * data-store.ts
 * Maneja configuración persistente de la tienda vía AppConfig en Prisma.
 * Los pedidos ya no se gestionan aquí — usan el modelo Order en Prisma.
 */
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const storeSettingsSchema = z.object({
  storeName:     z.string().min(1, 'El nombre de la tienda es requerido.'),
  tagline:       z.string().optional().default(''),
  phone:         z.string().min(1, 'El teléfono es requerido.'),
  phone2:        z.string().optional().default(''),
  email:         z.string().email('Email inválido.'),
  address:       z.string().optional().default('Barquisimeto, Lara — Venezuela. Atención y envíos a nivel nacional.'),
  instagram:     z.string().optional().default(''),
  facebook:      z.string().optional().default(''),
  pagoMovil: z.object({
    bank:     z.string().min(1),
    phone:    z.string().min(1),
    idNumber: z.string().min(1),
  }),
  transferencia: z.object({
    bank:          z.string().min(1),
    accountNumber: z.string().min(1),
    accountHolder: z.string().min(1),
    rif:           z.string().min(1),
  }),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

const SETTINGS_KEY = 'store_settings';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName:  'MundoTech',
  tagline:    'Tu tienda de confianza para tecnología, consolas, gadgets y electrodomésticos en Venezuela.',
  phone:      '0412-1471338',
  phone2:     '0414-5709470',
  email:      'ventas@mundotech.com',
  address:    'Barquisimeto, Lara — Venezuela. Atención y envíos a nivel nacional.',
  instagram:  '',
  facebook:   '',
  pagoMovil:  { bank: 'Banesco', phone: '0412-1471338', idNumber: 'V-12.345.678' },
  transferencia: {
    bank:          'Mercantil',
    accountNumber: '0105-0000-00-1234567890',
    accountHolder: 'MundoTech C.A.',
    rif:           'J-12345678-9',
  },
};

export async function readSettings(): Promise<StoreSettings> {
  try {
    const record = await prisma.appConfig.findUnique({ where: { key: SETTINGS_KEY } });
    if (!record) return DEFAULT_SETTINGS;
    return JSON.parse(record.value) as StoreSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function writeSettings(settings: StoreSettings): Promise<void> {
  await prisma.appConfig.upsert({
    where:  { key: SETTINGS_KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: SETTINGS_KEY, value: JSON.stringify(settings) },
  });
}
