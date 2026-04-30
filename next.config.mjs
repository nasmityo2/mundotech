/** @type {import('next').NextConfig} */
/** Image loader: see lib/cloudinaryLoader.js (f_auto, q_*, w_*, c_limit, dpr_auto). */

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
