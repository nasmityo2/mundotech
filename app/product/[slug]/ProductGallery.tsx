'use client';

import { useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { ProductGalleryItem } from '@/lib/product-media';
import { buildBunnyEmbedSrc } from '@/lib/product-media';
import { cn } from '@/lib/utils';

interface Props {
  items: ProductGalleryItem[];
  name: string;
  isOut: boolean;
  discountPct?: number | null;
}

function BunnySlide({
  embedUrl,
  name,
  loading,
  posterSrc,
  posterPriority,
}: {
  embedUrl: string;
  name: string;
  loading: 'eager' | 'lazy';
  posterSrc: string | null;
  posterPriority: boolean;
}) {
  const src = useMemo(() => buildBunnyEmbedSrc(embedUrl), [embedUrl]);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-950">
      {posterSrc && (
        <Image
          src={posterSrc}
          alt=""
          fill
          priority={posterPriority}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={cn(
            'object-cover transition-opacity duration-500',
            iframeLoaded ? 'opacity-0' : 'opacity-100',
          )}
          aria-hidden
        />
      )}
      <iframe
        title={`${name} — video`}
        src={src}
        loading={loading}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={() => setIframeLoaded(true)}
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0',
          'min-h-full min-w-full w-auto h-auto',
          'scale-[1.22] sm:scale-[1.18]',
        )}
      />
    </div>
  );
}

export default function ProductGallery({ items, name, isOut, discountPct }: Props) {
  const safeItems = items.length > 0 ? items : [{ type: 'IMAGE' as const, url: '/placeholder-product.png' }];
  const [active, setActive] = useState(0);
  const activeItem = safeItems[active];
  const activeIsVideo = activeItem?.type === 'VIDEO';

  const videoPoster = useCallback(
    (item: ProductGalleryItem) =>
      item.posterUrl?.trim() || safeItems.find(x => x.type === 'IMAGE')?.url || null,
    [safeItems],
  );

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-[96px]">
      <div
        className={cn(
          'relative w-full aspect-square overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50',
          'shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)] transition-shadow duration-300',
          activeIsVideo && 'bg-neutral-950',
        )}
      >
        {safeItems.map((item, i) => {
          const isActive = i === active;
          if (!isActive) return null;

          if (item.type === 'VIDEO') {
            return (
              <BunnySlide
                key={`${item.url}-${i}`}
                embedUrl={item.url}
                name={name}
                loading={i === 0 ? 'eager' : 'lazy'}
                posterSrc={videoPoster(item)}
                posterPriority={i === 0 && Boolean(videoPoster(item))}
              />
            );
          }

          return (
            <Image
              key={`${item.url}-${i}`}
              src={item.url}
              alt={name}
              fill
              priority={i === 0}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-6 sm:p-8 animate-fade-up bg-slate-50"
            />
          );
        })}

        {discountPct != null && discountPct > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
            -{discountPct}%
          </div>
        )}

        {isOut && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-white text-navy text-sm font-bold px-4 py-2 rounded-xl border border-slate-200 shadow-md">
              Agotado
            </span>
          </div>
        )}
      </div>

      {safeItems.length > 1 && (
        <div className="relative">
          <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-gutter:stable]">
            {safeItems.map((item, i) => {
              const selected = i === active;
              const thumbSrc =
                item.type === 'IMAGE'
                  ? item.url
                  : item.posterUrl?.trim() || safeItems.find(x => x.type === 'IMAGE')?.url || '/placeholder-product.png';

              return (
                <button
                  key={`thumb-${i}-${item.url}`}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={selected}
                  className={cn(
                    'relative shrink-0 w-[72px] sm:w-[80px] aspect-square rounded-xl overflow-hidden',
                    'border-2 transition-all duration-200 bg-slate-50',
                    'shadow-sm hover:shadow-md',
                    selected
                      ? 'border-navy ring-2 ring-brand-yellow/50 ring-offset-2 ring-offset-white'
                      : 'border-slate-200/90 hover:border-slate-400',
                  )}
                >
                  <Image
                    src={thumbSrc}
                    alt={`${name} vista ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  {item.type === 'VIDEO' && (
                    <span
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      aria-hidden
                    >
                      <span className="rounded-full bg-brand-yellow/95 p-2 shadow-md border border-yellow-500/80">
                        <Play className="w-4 h-4 text-navy" fill="currentColor" strokeWidth={0} />
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
