import type { ProductMedia } from '@prisma/client';

/** Item normalizado para la galería PDP (serializable al cliente). */
export type ProductGalleryItem = {
  type: 'IMAGE';
  url: string;
};

const PLACEHOLDER = '/placeholder-product.png';

/** Lista `images` para cards / carrito: orden de la galería, una URL por slide. */
export function deriveLegacyImagesFromSlots(
  slots: { type: 'IMAGE'; url: string }[],
): string[] {
  const out: string[] = [];
  for (const s of slots) {
    out.push(s.url);
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
      .filter(m => m.type !== 'VIDEO')
      .map(m => ({ type: 'IMAGE' as const, url: m.url }));
  }
  const imgs = product.images.filter(Boolean);
  const list = imgs.length > 0 ? imgs : [PLACEHOLDER];
  return list.map(url => ({ type: 'IMAGE' as const, url }));
}
