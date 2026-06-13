import type { ProductMedia } from '@prisma/client';

/** Item normalizado para la galería PDP (serializable al cliente). */
export type ProductGalleryItem =
  | { type: 'IMAGE'; url: string }
  | { type: 'VIDEO'; url: string; posterUrl?: string };

const PLACEHOLDER = '/placeholder-product.png';

/** Lista `images` para cards / carrito: solo URLs de imagen; video usa posterUrl como fallback. */
export function deriveLegacyImagesFromSlots(slots: ProductGalleryItem[]): string[] {
  const out: string[] = [];
  for (const s of slots) {
    if (s.type === 'IMAGE') {
      out.push(s.url);
    } else if (s.posterUrl) {
      out.push(s.posterUrl);
    }
  }
  if (out.length === 0) return [PLACEHOLDER];
  return out;
}

export function productToGalleryItems(product: {
  images: string[];
  media?: Pick<ProductMedia, 'type' | 'url' | 'posterUrl' | 'sortOrder'>[];
}): ProductGalleryItem[] {
  if (product.media && product.media.length > 0) {
    return [...product.media]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => {
        if (m.type === 'VIDEO') {
          return {
            type: 'VIDEO' as const,
            url: m.url,
            posterUrl: m.posterUrl ?? undefined,
          };
        }
        return { type: 'IMAGE' as const, url: m.url };
      });
  }
  const imgs = product.images.filter(Boolean);
  const list = imgs.length > 0 ? imgs : [PLACEHOLDER];
  return list.map((url) => ({ type: 'IMAGE' as const, url }));
}
