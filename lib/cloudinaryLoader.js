/**
 * Cloudinary image loader para Next.js.
 * Documentación: https://nextjs.org/docs/app/api-reference/components/image#loaderfile
 *
 * Inyecta automáticamente: f_auto (WebP/AVIF), q_auto:good, w_{width}, c_limit, dpr_auto.
 * Esto reduce ~60-70 % el peso en conexiones móviles lentas (contexto Venezuela).
 */
export default function cloudinaryLoader({ src, width, quality }) {
  const CLOUDINARY_BASE = 'https://res.cloudinary.com';

  if (!src) return src;

  // Non-Cloudinary images: update or add the `w` query param so Next.js
  // knows the loader respects width (avoids next-image-missing-loader-width).
  if (!src.startsWith(CLOUDINARY_BASE)) {
    try {
      const url = new URL(src);
      url.searchParams.set('w', width);
      return url.toString();
    } catch {
      return src;
    }
  }

  const uploadMarker = '/image/upload/';
  const uploadIndex  = src.indexOf(uploadMarker);
  if (uploadIndex === -1) return src;

  const base      = src.slice(0, uploadIndex + uploadMarker.length);
  const publicPart = src.slice(uploadIndex + uploadMarker.length);

  // Si ya tiene parámetros de transformación (contiene comas), no tocar
  const firstSegment = publicPart.split('/')[0];
  const hasTransforms = firstSegment.includes(',') || firstSegment.includes('_');
  const cleanPart    = hasTransforms ? publicPart.replace(/^[^/]+\//, '') : publicPart;

  const q          = quality ?? 'auto:good';
  const transforms = `f_auto,q_${q},w_${width},c_limit,dpr_auto`;

  return `${base}${transforms}/${cleanPart}`;
}
