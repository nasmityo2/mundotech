/** @type {import('next').NextConfig} */
/** Image loader: see lib/cloudinaryLoader.js (f_auto, q_*, w_*, c_limit, dpr_auto). */

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options',          value: 'DENY' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Productos pueden traer cualquier URL HTTPS (BD); fallbacks Unsplash/Bunny/Google maps assets.
      // Restringido a esquema https (no permite http: ni esquemas exóticos como javascript:).
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://res.cloudinary.com",
      "frame-src 'self' https://iframe.mediadelivery.net https://www.google.com https://maps.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  serverExternalPackages: ['@prisma/client', '.prisma/client'],

  async headers() {
    return [
      {
        // Aplica a todas las rutas del sitio
        source: '/(.*)',
        headers: securityHeaders,
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
    ];
  },

  images: {
    loader: 'custom',
    loaderFile: './lib/cloudinaryLoader.js',
    remotePatterns: [
      // Solo dominios activamente usados en producción
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;
