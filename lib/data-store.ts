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
  /**
   * PRD-027/130: Binance Pay configurable desde Admin → sin redeploy.
   * Vacíos por defecto: PaymentForm oculta el método si binancePayId está vacío
   * (evita mostrar instrucciones de pago sin destino real configurado).
   */
  binancePayId:  z.string().optional().default(''),
  binanceQrUrl:  z.string().optional().default(''),
  // Etiqueta de envío: tamaño de la HOJA de impresión en mm. Default térmica 4×6".
  labelWidthMm:  z.coerce.number().min(40).max(300).default(100),
  labelHeightMm: z.coerce.number().min(40).max(400).default(150),
  /// Número de WhatsApp para pedidos en modo WhatsApp (formato internacional, ej. 584121471338).
  whatsappOrderPhone: z.string().optional().default(''),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

const SETTINGS_KEY = 'store_settings';

// PRD-101: los datos de contacto provienen del material físico verificado de la
// tienda (letrero, tarjetas, marketing). Los datos FINANCIEROS (pago móvil,
// transferencia) NUNCA llevan placeholders: si la BD no tiene configuración
// quedan vacíos y el checkout debe ocultarlos (ver hasConfiguredPayments).
// Un cliente jamás debe ver una cuenta/RIF que no sea real.
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName:  'MundoTech',
  tagline:    'Conectados Contigo — tecnología, variedades y lo más viral para tu casa. Tienda física en Barquisimeto y envíos a toda Venezuela.',
  phone:      '0412-1471338',
  phone2:     '0414-5709470',
  email:      'ventas@mundotechve.com',
  address:    'Carrera 21 con esquina calle 21, Centro, Barquisimeto 3001, estado Lara.',
  instagram:  'https://instagram.com/Mundotech39',
  facebook:   '',
  // Sin datos bancarios por defecto: deben guardarse desde Admin → Configuración
  // antes del lanzamiento. storeSettingsSchema exige min(1) al ESCRIBIR, así que
  // el admin no puede persistir estos vacíos por accidente.
  pagoMovil:  { bank: '', phone: '', idNumber: '' },
  transferencia: {
    bank:          '',
    accountNumber: '',
    accountHolder: '',
    rif:           '',
  },
  // PRD-027/130: Binance Pay — vacíos por defecto, editables desde Admin.
  binancePayId: '',
  binanceQrUrl: '',
  labelWidthMm: 100,
  labelHeightMm: 150,
  whatsappOrderPhone: '',
};

/** ¿Hay datos de pago reales configurados? (false = BD vacía → DEFAULT_SETTINGS).
 *  DEPENDENCIA-02/04 (PRD-101): el checkout/PaymentForm debe ocultar los métodos
 *  pago móvil/transferencia cuando esto sea false, en vez de mostrar campos vacíos. */
export function hasConfiguredPayments(settings: StoreSettings): boolean {
  const pm = settings.pagoMovil;
  const tr = settings.transferencia;
  return Boolean(
    (pm.bank.trim() && pm.phone.trim() && pm.idNumber.trim()) ||
    (tr.bank.trim() && tr.accountNumber.trim() && tr.accountHolder.trim() && tr.rif.trim()),
  );
}

export async function readSettings(): Promise<StoreSettings> {
  try {
    const record = await prisma.appConfig.findUnique({ where: { key: SETTINGS_KEY } });
    if (!record) {
      // BD accesible pero sin settings guardados: estado esperado en tienda
      // recién instalada — no es un error, pero conviene dejar rastro en prod.
      if (process.env.NODE_ENV === 'production') {
        console.warn('[data-store] AppConfig sin "store_settings" — usando DEFAULT_SETTINGS (sin datos bancarios). Configura Admin → Configuración.');
      }
      return DEFAULT_SETTINGS;
    }
    // PRD-106: validar el JSON persistido en vez de castear a ciegas; si el
    // contenido está corrupto se registra el motivo y se degrada a DEFAULT.
    const parsed = storeSettingsSchema.safeParse(JSON.parse(record.value));
    if (!parsed.success) {
      console.error('[data-store] store_settings corrupto en AppConfig — usando DEFAULT_SETTINGS:', parsed.error.flatten().fieldErrors);
      return DEFAULT_SETTINGS;
    }
    return parsed.data;
  } catch (err) {
    // PRD-106: antes este catch tragaba el error en silencio → settings ficticios
    // sin ninguna señal. Se mantiene el fallback (no romper la página) pero con log.
    console.error('[data-store] readSettings falló (BD inaccesible?) — usando DEFAULT_SETTINGS:', err);
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
