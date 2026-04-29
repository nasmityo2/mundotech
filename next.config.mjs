/** @type {import('next').NextConfig} */

/**
 * Cloudinary loader — inyecta f_auto, q_auto y ancho en cada URL.
 * Optimizado para conexiones lentas (Venezuela): calidad 'auto:eco' en móvil,
 * formato automático WebP/AVIF, ancho limitado al slot real.
 */
function cloudinaryLoader({ src, width, quality }) {
  // Si la URL ya contiene transformaciones, la devolvemos tal cual
  if (src.includes('/image/upload/') && src.includes(',')) return src;

  // Extraer base y public_id de la URL de Cloudinary
  const cloudinaryBase = 'https://res.cloudinary.com';
  if (!src.startsWith(cloudinaryBase)) return src;

  const uploadIndex = src.indexOf('/image/upload/');
  if (uploadIndex === -1) return src;

  const base   = src.slice(0, uploadIndex + '/image/upload/'.length);
  const rest   = src.slice(uploadIndex + '/image/upload/'.length);
  // Elimina transformaciones previas si las hubiera (segmento antes de versión/id)
  const cleanRest = rest.replace(/^[a-z_,/]+\//, '');

  const q = quality ?? 'auto:good';
  const transforms = `f_auto,q_${q},w_${width},c_limit,dpr_auto`;

  return `${base}${transforms}/${cleanRest}`;
}

const nextConfig = {
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  images: {
    loader: 'custom',
    loaderFile: './lib/cloudinaryLoader.js',
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com',           pathname: '/**' },
      { protocol: 'https', hostname: 'source.unsplash.com',          pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com',          pathname: '/**' },
      { protocol: 'https', hostname: 'dnk6c0qqjlnx7.cloudfront.net', pathname: '/**' },
      { protocol: 'https', hostname: 'www.tiendasdaka.com',           pathname: '/**' },
      { protocol: 'https', hostname: '*.cloudfront.net',             pathname: '/**' },
      { protocol: 'https', hostname: 'i.imgur.com',                  pathname: '/**' },
      { protocol: 'https', hostname: 'imgur.com',                    pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.shopify.com',              pathname: '/**' },
      { protocol: 'https', hostname: '*.supabase.co',                pathname: '/**' },
    ],
  },
};

export default nextConfig;
