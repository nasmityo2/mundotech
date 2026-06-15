'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { ProductGalleryItem } from '@/lib/product-media';
import { cn } from '@/lib/utils';

interface Props {
  items: ProductGalleryItem[];
  name: string;
  isOut: boolean;
  discountPct?: number | null;
}

export default function ProductGallery({ items, name, isOut, discountPct }: Props) {
  const safeItems = items.length > 0 ? items : [{ type: 'IMAGE' as const, url: '/placeholder-product.png' }];
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sincroniza el índice activo con el slide visible al deslizar
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slides.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = slides.indexOf(entry.target as HTMLDivElement);
            if (idx >= 0) setActive(idx);
          }
        });
      },
      { root: track, threshold: [0.6] },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [safeItems.length]);

  const goTo = (i: number) => {
    slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setActive(i);
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 lg:sticky lg:top-[96px]">
      {/* Carrusel deslizable — borde a borde en móvil, contenedor normal en ≥sm */}
      <div className="relative w-screen ml-[calc(50%-50vw)] sm:w-auto sm:ml-0">
        <div
          ref={trackRef}
          className={cn(
            'flex overflow-x-auto snap-x snap-mandatory scroll-smooth',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            'sm:rounded-2xl sm:border sm:border-slate-200/90',
          )}
        >
          {safeItems.map((item, i) => (
            <div
              key={`slide-${i}-${item.url}`}
              ref={(el) => { slideRefs.current[i] = el; }}
              className="relative w-full shrink-0 snap-center aspect-square bg-slate-50"
            >
              {item.type === 'VIDEO' ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={item.posterUrl ?? undefined}
                  className="absolute inset-0 w-full h-full object-contain bg-slate-50"
                >
                  <source src={item.url} type="video/mp4" />
                </video>
              ) : (
                <Image
                  src={item.url}
                  alt={`${name} — imagen ${i + 1}`}
                  fill
                  priority={i === 0}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-1.5 sm:p-4"
                />
              )}
            </div>
          ))}
        </div>

        {discountPct != null && discountPct > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
            -{discountPct}%
          </div>
        )}

        {safeItems.length > 1 && (
          <div className="absolute bottom-3 right-3 z-10 bg-black/55 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm tabular-nums">
            {active + 1} / {safeItems.length}
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

      {/* Puntos indicadores (solo móvil/tablet) */}
      {safeItems.length > 1 && (
        <div className="flex justify-center gap-1.5 lg:hidden">
          {safeItems.map((_, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a la imagen ${i + 1}`}
              className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-5 bg-navy' : 'w-1.5 bg-slate-300')}
            />
          ))}
        </div>
      )}

      {/* Miniaturas (solo escritorio) */}
      {safeItems.length > 1 && (
        <div className="hidden lg:flex gap-2.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-gutter:stable]">
          {safeItems.map((item, i) => {
            const selected = i === active;
            const thumbSrc = item.type === 'VIDEO' ? (item.posterUrl ?? '/placeholder-product.png') : item.url;
            return (
              <button
                key={`thumb-${i}-${item.url}`}
                type="button"
                onClick={() => goTo(i)}
                aria-current={selected}
                className={cn(
                  'relative shrink-0 w-[80px] aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 bg-slate-50 shadow-sm hover:shadow-md',
                  selected ? 'border-navy ring-2 ring-brand-yellow/50 ring-offset-2 ring-offset-white' : 'border-slate-200/90 hover:border-slate-400',
                )}
              >
                <Image src={thumbSrc} alt={`${name} vista ${i + 1}`} fill sizes="80px" className="object-cover" />
                {item.type === 'VIDEO' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                    <Play size={22} className="text-white fill-white/90" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
