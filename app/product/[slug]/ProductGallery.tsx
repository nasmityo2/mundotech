'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Play, X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductGalleryItem } from '@/lib/product-media';
import { cn } from '@/lib/utils';

interface Props {
  items: ProductGalleryItem[];
  name: string;
  isOut: boolean;
  discountPct?: number | null;
}

const PLACEHOLDER = '/placeholder-product.png';

export default function ProductGallery({ items, name, isOut, discountPct }: Props) {
  const safeItems = items.length > 0 ? items : [{ type: 'IMAGE' as const, url: PLACEHOLDER }];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      {/* Carrusel */}
      <div className="relative w-full">
        <div
          ref={trackRef}
          className={cn(
            'flex overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-xl',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {safeItems.map((item, i) => (
            <div
              key={`slide-${i}-${item.url}`}
              ref={(el) => { slideRefs.current[i] = el; }}
              className="relative w-full shrink-0 snap-center aspect-square bg-surface-muted rounded-xl"
            >
              {item.type === 'VIDEO' ? (
                <CarouselVideo item={item} />
              ) : (
                <>
                  <Image
                    src={item.url}
                    alt={`${name} — imagen ${i + 1}`}
                    fill
                    priority={i === 0}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain p-1.5 sm:p-4"
                  />
                  <button
                    type="button"
                    onClick={() => setLightbox(i)}
                    aria-label="Ver en pantalla completa"
                    className="absolute inset-0 z-[5] cursor-zoom-in"
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => setLightbox(i)}
                aria-label="Pantalla completa"
                className="absolute top-3 right-3 z-[15] bg-black/45 hover:bg-black/65 text-white rounded-full p-2 backdrop-blur-sm transition"
              >
                <Maximize2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {discountPct != null && discountPct > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">
            -{discountPct}%
          </div>
        )}

        {safeItems.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-navy/75 text-white text-[12px] font-medium px-3 py-1 rounded-full backdrop-blur-sm tabular-nums pointer-events-none">
              {active + 1} / {safeItems.length}
            </div>
            <div
              className="mt-3 flex items-center justify-center gap-2"
              role="tablist"
              aria-label="Imágenes del producto"
            >
              {safeItems.map((_, i) => {
                const selected = i === active;
                return (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={`Imagen ${i + 1} de ${safeItems.length}`}
                    onClick={() => goTo(i)}
                    className="inline-flex min-w-[44px] min-h-[44px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
                  >
                    <span
                      className={cn(
                        'block rounded-full transition-all duration-300',
                        selected ? 'h-2.5 w-6 bg-brand-yellow' : 'h-2.5 w-2.5 bg-border hover:bg-navy/30',
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {isOut && (
          <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <span className="bg-white text-navy text-sm font-bold px-4 py-2 rounded-xl border border-slate-200 shadow-md">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Miniaturas (solo escritorio) */}
      {safeItems.length > 1 && (
        <div className="hidden lg:flex gap-2.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-gutter:stable]">
          {safeItems.map((item, i) => {
            const selected = i === active;
            const thumbSrc = item.type === 'VIDEO' ? (item.posterUrl ?? PLACEHOLDER) : item.url;
            return (
              <button
                key={`thumb-${i}-${item.url}`}
                type="button"
                onClick={() => goTo(i)}
                aria-current={selected}
                className={cn(
                  'relative shrink-0 w-[80px] aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 bg-surface-muted shadow-soft hover:shadow-card',
                  selected ? 'border-navy ring-2 ring-brand-yellow/50 ring-offset-2 ring-offset-white' : 'border-border hover:border-navy/40',
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

      {lightbox != null && (
        <Lightbox items={safeItems} startIndex={lightbox} name={name} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

/* ── Video del carrusel: fondo borroso + play grande + controles nativos ── */
function CarouselVideo({ item }: { item: Extract<ProductGalleryItem, { type: 'VIDEO' }> }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  return (
    <div className="absolute inset-0 bg-black">
      {item.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.posterUrl}
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl opacity-50"
        />
      )}
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-contain"
        poster={item.posterUrl ?? undefined}
        controls={started}
        playsInline
        preload="metadata"
        onPlay={() => setStarted(true)}
      >
        <source src={item.url} type="video/mp4" />
      </video>

      {!started && (
        <button
          type="button"
          onClick={() => { void ref.current?.play(); }}
          aria-label="Reproducir video"
          className="absolute inset-0 z-[6] flex items-center justify-center group"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition group-hover:scale-105 group-active:scale-95">
            <Play size={28} className="ml-1 fill-navy text-navy" />
          </span>
        </button>
      )}
    </div>
  );
}

/* ── Visor a pantalla completa con ZOOM (pellizcar + doble toque) ── */
function Lightbox({
  items, startIndex, name, onClose,
}: {
  items: ProductGalleryItem[];
  startIndex: number;
  name: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Bloquea el scroll del fondo
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Al cambiar de slide se resetea el zoom
  useEffect(() => { setZoomed(false); }, [index]);

  // Cerrar con Escape / flechas en escritorio
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(items.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, items.length]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(items.length - 1, i + 1)), [items.length]);

  if (!mounted) return null;
  const item = items[index];

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black flex flex-col select-none">
      {/* Barra superior */}
      <div className="flex items-center justify-end px-4 py-3 text-white/90">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition"
        >
          <X size={24} />
        </button>
      </div>

      {/* Contenido (una pieza a la vez) — deslizar solo cuando NO hay zoom */}
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => {
          if (!zoomed && e.touches.length === 1) touchStartX.current = e.touches[0].clientX;
          else touchStartX.current = null;
        }}
        onTouchEnd={(e) => {
          if (zoomed || touchStartX.current == null) { touchStartX.current = null; return; }
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
          touchStartX.current = null;
        }}
      >
        {item.type === 'VIDEO' ? (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <video
              key={`v-${index}`}
              src={item.url}
              poster={item.posterUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <TransformWrapper
            key={`img-${index}`}
            minScale={1}
            maxScale={4}
            doubleClick={{ mode: 'toggle', step: 2.5 }}
            pinch={{ step: 5 }}
            wheel={{ step: 0.15 }}
            panning={{ disabled: !zoomed }}
            onTransform={(_ref, state) => setZoomed(state.scale > 1.01)}
          >
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={`${name} — imagen ${index + 1}`}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>

      {/* Contador centrado abajo */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[2] bg-white/10 text-white text-[13px] font-medium px-3 py-1 rounded-full backdrop-blur-sm tabular-nums">
          {index + 1} / {items.length}
        </div>
      )}

      {/* Flechas (escritorio) */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            aria-label="Anterior"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-30"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === items.length - 1}
            aria-label="Siguiente"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-30"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
