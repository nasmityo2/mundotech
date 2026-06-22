import type { MetadataRoute } from 'next';
import { readSettings } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

/**
 * Manifest PWA público (instalable en móvil + señal SEO). El nombre y la
 * descripción se leen de la configuración editable de la tienda.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await readSettings();
  return {
    name: `${settings.storeName} — Tecnología, hogar y variedades en Barquisimeto`,
    short_name: settings.storeName,
    description:
      settings.tagline ||
      'Variedades en Barquisimeto: tecnología, hogar, cocina, fitness y más. Precios USD/Bs., retiro en tienda y envíos por MRW, Zoom y Tealca.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0B1220',
    lang: 'es-VE',
    categories: ['shopping', 'electronics', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
