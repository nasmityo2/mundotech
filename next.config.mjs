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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",    // unsafe-eval requerido por Next.js en dev; en prod usar nonce
      "style-src 'self' 'unsafe-inline'",                    // Tailwind requiere unsafe-inline
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "font-src 'self'",
      "connect-src 'self' https://res.cloudinary.com",
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
