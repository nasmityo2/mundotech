/** @type {import('next').NextConfig} */
/** Image loader: see lib/cloudinaryLoader.js (f_auto, q_*, w_*, c_limit, dpr_auto). */

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
