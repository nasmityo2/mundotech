import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mundotech.com.ve';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Bots genéricos: acceso total excepto rutas sensibles
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/checkout',
          '/checkout/',
          '/api/',
          '/account',
          '/account/',
          '/wishlist',
        ],
      },
      {
        // GPTBot y similares: sin acceso a contenido privado
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
