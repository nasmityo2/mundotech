'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { HeroBannerRow } from '@/app/components/Hero';

type Slide = {
  variant: 'welcome' | 'standard';
  badge: string;
  title: string;
  sub: string;
  cta: string;
  href: string;
  img: string;
  tag: string;
};

function toSlide(b: HeroBannerRow): Slide {
  return {
    variant: b.title ? 'standard' : 'welcome',
    badge: b.label ?? '',
    title: b.title ?? '',
    sub: b.subtitle ?? '',
    cta: b.ctaText ?? 'Ver catálogo',
    href: b.link ?? '/productos',
    img: b.imageUrl,
    tag: b.tagText ?? '',
  };
}

const US = (id: string, w = 2400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=max&w=${w}&q=95`;

const FALLBACK_SLIDES: Slide[] = [
  {
    variant: 'welcome',
    badge: 'Barquisimeto · Venezuela',
    title: '',
    sub:
      'Tu tienda de tecnología en el C.C. Minicentro 34, Calle 22: gaming retro, gadgets, inventos trending y electrodomésticos de cocina mesa compacta —no celulares. Envío seguro y garantía oficial.',
    cta: 'Ver catálogo',
    href: '/productos',
    img: US('photo-1550745165-9bc0b252726f'),
    tag: '',
  },
];

function BadgePill({ label }: { label: string }) {
  if (!label.trim()) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[#E6C200] bg-[#FFD700] px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-[#0B0B0B] antialiased">
      <Tag size={11} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Hero adaptable: stack vertical en móvil, horizontal en desktop. Sin overflow.
 */
export default function HomeHeroCyber({ slides: dbSlides }: { slides?: HeroBannerRow[] }) {
  const fromDatabase = Boolean(dbSlides && dbSlides.length > 0);
  const slides: Slide[] =
    fromDatabase && dbSlides ? dbSlides.map(toSlide) : FALLBACK_SLIDES;

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setActive((v) => (v + 1) % slides.length), 6500);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[active] ?? slides[0];

  const showCopy =
    Boolean(slide.tag?.trim()) ||
    Boolean(slide.badge?.trim()) ||
    Boolean(slide.sub?.trim()) ||
    Boolean(slide.title?.trim());

  const altText =
    slide.variant === 'welcome' && !slide.title.trim()
      ? 'MundoTech — bienvenida'
      : slide.title.replace(/\n/g, ' ') || slide.badge || 'Banner MundoTech';

  return (
    <section className="relative w-full max-w-full overflow-hidden rounded-none bg-[#0B0B0B] antialiased shadow-[0_18px_45px_-16px_rgba(0,0,0,0.28)] ring-0 sm:rounded-2xl sm:ring-1 sm:ring-black/10">
      <div className="relative w-full h-[260px] xs:h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px] xl:h-[460px]">
        <Image
          key={`hero-${slide.img}-${active}`}
          src={slide.img}
          alt={altText}
          fill
          priority={active === 0}
          fetchPriority={active === 0 ? 'high' : 'auto'}
          quality={90}
          sizes="(max-width: 640px) 100vw, (max-width: 1400px) 100vw, 1400px"
          className="object-cover object-center"
        />

        {showCopy && (
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/55 to-black/15 sm:bg-gradient-to-r sm:from-black/75 sm:via-black/40 sm:to-transparent"
            aria-hidden
          />
        )}

        {slide.tag?.trim() ? (
          <span className="absolute right-3 top-3 sm:right-5 sm:top-5 z-[2] rounded-md border border-[#E6C200] bg-[#FFD700] px-2 py-1 text-[10px] sm:text-[11px] font-bold text-[#0B0B0B] shadow-lg">
            {slide.tag}
          </span>
        ) : null}

        {/* Fallback h1 for screen readers when the hero has no visible copy */}
        {!showCopy && (
          <h1 className="sr-only">
            Mundo Tech: Conectados Contigo · tecnología en Barquisimeto · gadgets, inventos y electro cocina compacta · sin celulares
          </h1>
        )}

        {showCopy ? (
          <div className="relative z-10 flex h-full w-full items-end sm:items-center px-4 pb-5 pt-4 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-full sm:max-w-2xl lg:max-w-[min(36rem,52%)] xl:max-w-2xl text-left"
            >
              <BadgePill label={slide.badge} />

              {slide.title.trim() ? (
                <h1 className="mt-2 text-balance text-[1.4rem] xs:text-[1.55rem] sm:text-[1.85rem] md:text-[2rem] lg:text-[2.15rem] xl:text-[2.35rem] font-bold leading-[1.12] tracking-tight text-white whitespace-pre-line drop-shadow-[0_2px_22px_rgba(0,0,0,0.55)]">
                  {slide.title}
                </h1>
              ) : !fromDatabase && slide.variant === 'welcome' ? (
                <h1 className="mt-2 text-balance text-[1.4rem] xs:text-[1.55rem] sm:text-[1.85rem] md:text-[2rem] lg:text-[2.15rem] xl:text-[2.35rem] font-bold leading-[1.12] tracking-tight text-white drop-shadow-[0_2px_22px_rgba(0,0,0,0.55)]">
                  ¡BIENVENIDOS A <span className="text-[#FFD700]">MUNDOTECH</span>!
                </h1>
              ) : (
                <h1 className="sr-only">
                  Mundo Tech: Conectados Contigo · tecnología en Barquisimeto · gadgets, inventos y electro cocina compacta · sin celulares
                </h1>
              )}

              {slide.sub.trim() ? (
                <p className="mt-2 max-w-full sm:max-w-lg text-[13px] sm:text-[15px] font-medium leading-snug text-white/95 drop-shadow-md sm:leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {slide.sub}
                </p>
              ) : null}

              <div className="mt-3 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                <Link
                  href={slide.href}
                  className="btn-mundotech-shimmer inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E6C200] bg-[#FFD700] px-4 sm:px-5 text-[13px] sm:text-sm font-black text-black shadow-lg transition-all duration-300 active:scale-[0.97] hover:bg-[#FFE03A]"
                >
                  {slide.cta} <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
                </Link>
                <Link
                  href="/productos"
                  className="hidden xs:inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/35 bg-white/10 px-4 sm:px-5 text-[13px] sm:text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 active:scale-[0.97] hover:border-[#FFD700]/45 hover:bg-white/15"
                >
                  Ver catálogo
                </Link>
              </div>
            </motion.div>
          </div>
        ) : null}

        {slides.length > 1 ? (
          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-4">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir al slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? 'w-6 bg-[#FFD700]' : 'w-1.5 bg-white/45'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
