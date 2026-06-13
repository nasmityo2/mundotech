/** @type {import('next').NextConfig} */
/**
 * Headers estáticos que no requieren nonce por petición.
 * El Content-Security-Policy (con nonce dinámico por request) lo genera middleware.ts,
 * que cubre todas las rutas HTML excepto _next/static y _next/image.
 */
const securityHeaders = [
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  // HSTS: los navegadores lo ignoran sobre HTTP plano, así que es seguro
  // emitirlo siempre; en producción (HTTPS) fuerza TLS por 1 año.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

/** Hostname del CDN público de R2 (R2_PUBLIC_BASE_URL). */
function r2RemotePattern() {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  try {
    const u = new URL(base);
    if (u.protocol !== 'https:') return null;
    return { protocol: 'https', hostname: u.hostname, pathname: '/**' };
  } catch {
    return null;
  }
}

const remotePatterns = [];

const r2Pattern = r2RemotePattern();
if (r2Pattern) {
  remotePatterns.push(r2Pattern);
}

const nextConfig = {
  // PRD-071: no exponer el framework al servidor ("X-Powered-By: Next.js").
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  serverExternalPackages: ['@prisma/client', '.prisma/client', 'sharp', '@aws-sdk/client-s3'],

  async headers() {
    return [
      {
        // Aplica a todas las rutas del sitio
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },

  /** Peticiones legacy que piden `/favicon.ico` → mismo asset que `app/icon.svg`. */
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
        permanent: false,
      },
      // Alias en español de páginas legales/informativas (URLs memorables
      // para clientes locales + evitan 404 desde material impreso).
      { source: '/privacidad',    destination: '/privacy-policy',   permanent: true },
      { source: '/terminos',      destination: '/terms-of-service', permanent: true },
      { source: '/envios',        destination: '/shipping-policy',  permanent: true },
      { source: '/about',         destination: '/nosotros',         permanent: true },
      { source: '/quienes-somos', destination: '/nosotros',         permanent: true },
    ];
  },

  images: {
    // Optimizador por defecto de Next.js contra el dominio público de R2.
    // TODO: transformación on-the-fly opcional con Cloudflare Image Resizing (cdn-cgi/image).
    remotePatterns,
  },
};

export default nextConfig;
