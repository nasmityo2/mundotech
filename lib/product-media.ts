import type { ProductMedia } from '@prisma/client';

/** Item normalizado para la galería PDP (serializable al cliente). */
export type ProductGalleryItem = {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  posterUrl?: string | null;
};

const PLACEHOLDER = '/placeholder-product.png';

const BUNNY_PLAYER_PARAMS = {
  autoplay: 'true',
  muted: 'true',
  loop: 'true',
  preload: 'true',
  responsive: 'false',
  controls: 'false',
} as const;

/**
 * Ajusta la URL del iframe Bunny para autoplay silencioso en bucle y sin controles visibles.
 * Acepta URL completa del embed o se concatena sobre el host de Bunny.
 */
export function buildBunnyEmbedSrc(embedUrl: string): string {
  const raw = embedUrl.trim();
  if (!raw) return raw;

  let base: string;
  let existing = new URLSearchParams();

  try {
    const parsed = new URL(raw, 'https://iframe.mediadelivery.net');
    base = `${parsed.origin}${parsed.pathname}`;
    existing = parsed.searchParams;
  } catch {
    return raw;
  }

  const next = new URLSearchParams(existing);
  for (const [k, v] of Object.entries(BUNNY_PLAYER_PARAMS)) {
    next.set(k, v);
  }
  const q = next.toString();
  return q ? `${base}?${q}` : base;
}

/** Lista `images` para cards / carrito: orden de la galería, una URL por slide (poster en vídeos). */
export function deriveLegacyImagesFromSlots(
  slots: { type: 'IMAGE' | 'VIDEO'; url: string; posterUrl?: string | null }[],
): string[] {
  const out: string[] = [];
  for (const s of slots) {
    if (s.type === 'IMAGE') out.push(s.url);
    else if (s.posterUrl?.trim()) out.push(s.posterUrl.trim());
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
      .map(m => ({
        type: m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        url: m.url,
        posterUrl: m.posterUrl,
      }));
  }
  const imgs = product.images.filter(Boolean);
  const list = imgs.length > 0 ? imgs : [PLACEHOLDER];
  return list.map(url => ({ type: 'IMAGE' as const, url }));
}
