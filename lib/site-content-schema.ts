/**
 * Schema, tipos y defaults PUROS del contenido editable del sitio — sin
 * imports de Prisma, importable desde Client Components (editor del admin,
 * popup). La persistencia (server-only) vive en lib/site-content.ts.
 *
 * Los defaults usan los datos verificados del material físico de la tienda
 * (letrero, tarjetas, marketing) — nunca placeholders.
 */
import { z } from 'zod';

export const SITE_CONTENT_KEY = 'site_content';

export const trustIconSchema = z.enum([
  'shield',
  'truck',
  'wallet',
  'store',
  'clock',
  'whatsapp',
  'sparkles',
]);
export type TrustIcon = z.infer<typeof trustIconSchema>;

export const siteContentSchema = z.object({
  /** Slide que muestra el hero cuando el admin no ha creado banners. */
  heroFallback: z.object({
    badge: z.string().max(60).default(''),
    title: z.string().max(90).default(''),
    subtitle: z.string().max(240).default(''),
    ctaText: z.string().max(40).default('Explorar todo el catálogo'),
    ctaLink: z.string().max(300).default('/productos'),
    imageUrl: z.string().max(500).default(''),
  }),
  /** Franja fina bajo el hero con el slogan real — visible siempre. */
  brandStrip: z.object({
    enabled: z.boolean().default(true),
    slogan: z.string().max(60).default('CONECTADOS CONTIGO'),
    note: z.string().max(140).default(''),
  }),
  /** Botón flotante de WhatsApp en todas las páginas públicas. */
  whatsapp: z.object({
    enabled: z.boolean().default(true),
    phone: z.string().max(20).default('0412-1471338'),
    message: z.string().max(300).default(''),
  }),
  /** Badges de confianza de la ficha de producto (3 ítems). */
  productTrust: z
    .array(
      z.object({
        icon: trustIconSchema.default('shield'),
        title: z.string().max(60),
        sub: z.string().max(120).default(''),
      }),
    )
    .min(1)
    .max(4),
  /** Popup promocional opcional (apagado por defecto). */
  popup: z.object({
    enabled: z.boolean().default(false),
    badge: z.string().max(40).default(''),
    title: z.string().max(90).default(''),
    text: z.string().max(240).default(''),
    ctaText: z.string().max(40).default(''),
    ctaLink: z.string().max(300).default('/productos'),
    imageUrl: z.string().max(500).default(''),
    /** Días que esperamos antes de volver a mostrarlo tras cerrarse. */
    frequencyDays: z.number().int().min(1).max(90).default(7),
    /** Segundos de navegación antes de aparecer. */
    delaySeconds: z.number().int().min(0).max(120).default(6),
  }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroFallback: {
    badge: 'Tienda física en Barquisimeto',
    title: 'CONECTADOS CONTIGO',
    subtitle:
      'Tecnología, variedades y los productos virales del momento. Visítanos en el C.C. Minicentro 34, Calle 22 — o pide por la web y te lo enviamos a cualquier parte de Venezuela.',
    ctaText: 'Explorar todo el catálogo',
    ctaLink: '/productos',
    imageUrl: '',
  },
  brandStrip: {
    enabled: true,
    slogan: 'CONECTADOS CONTIGO',
    note: 'C.C. Minicentro 34, Calle 22 · Barquisimeto · 0412-1471338',
  },
  whatsapp: {
    enabled: true,
    phone: '0412-1471338',
    message: '¡Hola MundoTech! Vengo de la página web y quiero preguntar por un producto.',
  },
  productTrust: [
    {
      icon: 'shield',
      title: '12 meses de garantía directa',
      sub: 'La gestionas con nosotros, sin intermediarios',
    },
    {
      icon: 'truck',
      title: 'Delivery en Barquisimeto en 24h',
      sub: 'Y envíos a todo el país por MRW o Zoom',
    },
    {
      icon: 'wallet',
      title: 'Pago Móvil · Transferencia · Binance',
      sub: 'Pagas en bolívares o en dólares, a tasa del día',
    },
  ],
  popup: {
    enabled: false,
    badge: 'Solo esta semana',
    title: 'Tremendo precio en lo más pedido',
    text: 'Pásate por el catálogo: bajamos el precio de los productos que más nos piden por WhatsApp.',
    ctaText: 'Ver las ofertas',
    ctaLink: '/productos',
    imageUrl: '',
    frequencyDays: 7,
    delaySeconds: 6,
  },
};
