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
      {/* Carrusel deslizable — borde a borde en móvil */}
      <div className="relative w-screen ml-[calc(50%-50vw)] sm:w-auto sm:ml-0">
        <div
          ref={trackRef}
          className={cn(
            'flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth',
            'touch-pan-x overscroll-x-contain',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            'sm:rounded-2xl sm:border sm:border-slate-200/90',
          )}
        >
          {safeItems.map((item, i) => (
            <div
              key={`slide-${i}-${item.url}`}
              ref={(el) => { slideRefs.current[i] = el; }}
              className="relative w-full shrink-0 snap-center aspect-square bg-white"
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
                    draggable={false}
                    className="object-contain p-1.5 sm:p-4 select-none pointer-events-none"
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
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/55 text-white text-[12px] font-medium px-3 py-1 rounded-full backdrop-blur-sm tabular-nums pointer-events-none">
            {active + 1} / {safeItems.length}
          </div>
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
                  'relative shrink-0 w-[80px] aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 bg-white shadow-sm hover:shadow-md',
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

      {lightbox != null && (
        <Lightbox items={safeItems} startIndex={lightbox} name={name} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

/* ── Video del carrusel: fondo negro + póster borroso + play grande + controles nativos ── */
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

/* ── Visor pantalla completa: fondo blanco para imágenes, swipe que sigue el dedo + zoom ── */
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
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const axis = useRef<'h' | 'v' | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Al cambiar de slide se resetea el zoom
  useEffect(() => { setZoomed(false); }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(items.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, items.length]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(items.length - 1, i + 1)), [items.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (zoomed || e.touches.length !== 1) { startX.current = null; return; }
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    axis.current = null;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - (startY.current ?? 0);
    if (axis.current == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      axis.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }
    if (axis.current !== 'h') return;
    let d = dx;
    if ((index === 0 && dx > 0) || (index === items.length - 1 && dx < 0)) d = dx * 0.3;
    setDragX(d);
  };
  const onTouchEnd = () => {
    if (startX.current != null && axis.current === 'h') {
      const w = viewportRef.current?.clientWidth ?? window.innerWidth;
      const threshold = Math.min(90, w * 0.2);
      if (dragX < -threshold && index < items.length - 1) setIndex((i) => i + 1);
      else if (dragX > threshold && index > 0) setIndex((i) => i - 1);
    }
    startX.current = null;
    startY.current = null;
    axis.current = null;
    setDragging(false);
    setDragX(0);
  };

  if (!mounted) return null;
  const current = items[index];
  const bgClass = current.type === 'VIDEO' ? 'bg-black' : 'bg-white';

  return createPortal(
    <div className={cn('fixed inset-0 z-[120] flex flex-col select-none transition-colors duration-200', bgClass)}>
      {/* Cerrar */}
      <div className="absolute top-0 right-0 z-[4] p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65 transition"
        >
          <X size={22} />
        </button>
      </div>

      {/* Carril deslizable (sigue el dedo) */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={cn('flex h-full w-full', dragging ? '' : 'transition-transform duration-300 ease-out')}
          style={{ transform: `translateX(calc(${-index * 100}% + ${dragX}px))` }}
        >
          {items.map((item, i) => (
            <div key={`lb-${i}-${item.url}`} className="relative w-full h-full shrink-0 flex items-center justify-center">
              {item.type === 'VIDEO' ? (
                <video
                  src={item.url}
                  poster={item.posterUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-full max-w-full object-contain"
                />
              ) : i === index ? (
                <TransformWrapper
                  key={`tw-${index}`}
                  minScale={1}
                  maxScale={4}
                  centerOnInit
                  doubleClick={{ mode: 'toggle', step: 2.5 }}
                  wheel={{ disabled: true }}
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
                      alt={`${name} — imagen ${i + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={`${name} — imagen ${i + 1}`}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contador centrado abajo */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[3] bg-black/45 text-white text-[13px] font-medium px-3 py-1 rounded-full backdrop-blur-sm tabular-nums pointer-events-none">
          {index + 1} / {items.length}
        </div>
      )}

      {/* Flechas (escritorio) */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            aria-label="Anterior"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-[3] w-11 h-11 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 text-white transition disabled:opacity-30"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={index === items.length - 1}
            aria-label="Siguiente"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-[3] w-11 h-11 items-center justify-center rounded-full bg-black/45 hover:bg-black/65 text-white transition disabled:opacity-30"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
