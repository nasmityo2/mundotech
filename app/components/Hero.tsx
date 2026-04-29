'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Truck, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';

// ── DB Banner shape (hero type) ───────────────────────────────────────────────
export interface HeroBannerRow {
  id:       string;
  imageUrl: string;
  title:    string | null;
  subtitle: string | null;
  label:    string | null;
  ctaText:  string | null;
  tagText:  string | null;
  link:     string | null;
}

// ── Internal slide shape ──────────────────────────────────────────────────────
type Slide = {
  variant: 'welcome' | 'standard';
  badge:   string;
  title:   string;
  sub:     string;
  cta:     string;
  href:    string;
  img:     string;
  tag:     string;
};

/** Converts a DB Banner row to our internal Slide format */
function toSlide(b: HeroBannerRow): Slide {
  return {
    variant: b.title ? 'standard' : 'welcome',
    badge:   b.label   ?? 'MundoTech',
    title:   b.title   ?? '',
    sub:     b.subtitle ?? '',
    cta:     b.ctaText ?? 'Ver catálogo',
    href:    b.link    ?? '/productos',
    img:     b.imageUrl,
    tag:     b.tagText ?? 'Nuevo',
  };
}

/** Alta resolución + calidad máxima */
const US = (id: string, w = 2400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=max&w=${w}&q=95`;

// ── Fallback slides (used when no DB hero banners exist) ──────────────────────
const FALLBACK_SLIDES: Slide[] = [
  {
    variant: 'welcome',
    badge:   'MundoTech',
    title:   '',
    sub:     'Desde Barquisimeto para toda Venezuela. Lo último en Gaming Retro, Apple y Cuidado Personal Tech.',
    cta:     'Ver catálogo',
    href:    '/productos',
    img:     US('photo-1592899677979-966312976a8a'),
    tag:     'Nuevo',
  },
  {
    variant: 'standard',
    badge:   'Gaming portátil',
    title:   'Consola R36S\ny handheld retro',
    sub:     'Gaming portátil con acabado profesional — imagen nítida, stock verificado y envío seguro.',
    cta:     'Ver gaming',
    href:    '/productos?cat=Consolas',
    img:     US('photo-1612288532018-60aa10ad7d5f'),
    tag:     'Disponible',
  },
  {
    variant: 'standard',
    badge:   'iPhone & Apple',
    title:   'iPhone última\ngeneración',
    sub:     'Smartphones y ecosistema Apple con presentación limpia y máxima claridad visual.',
    cta:     'Ver Apple',
    href:    '/productos?cat=Smartphones',
    img:     US('photo-1510557880182-3d4d3cba35a5'),
    tag:     'Destacado',
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function BadgePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#FFD700] text-[#0B0B0B] text-[11px] font-bold px-3 py-1.5 rounded-md border border-[#E6C200] antialiased">
      <Tag size={11} aria-hidden />
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const Hero = ({ slides: dbSlides }: { slides?: HeroBannerRow[] }) => {
  const slides: Slide[] =
    dbSlides && dbSlides.length > 0 ? dbSlides.map(toSlide) : FALLBACK_SLIDES;

  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[active] ?? slides[0];
  /** Overlay oscuro solo si hay texto sobre la imagen */
  const hasHeroCopy =
    Boolean(slide.badge?.trim()) ||
    Boolean(slide.sub?.trim()) ||
    slide.variant === 'welcome' ||
    Boolean(slide.title?.trim());

  return (
    <section className="-mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-[#0B0B0B] relative antialiased">
      <div
        className="relative w-full min-h-[320px] h-[400px] sm:h-[420px] lg:h-[440px] max-h-[520px]"
      >
        {/* Fondo borde a borde */}
        <Image
          key={`bg-${slide.img}-${active}`}
          src={slide.img}
          alt={
            slide.variant === 'welcome'
              ? 'Bienvenida MundoTech'
              : (slide.title?.replace(/\n/g, ' ') || slide.badge || 'Banner promocional')
          }
          fill
          priority={active === 0}
          quality={95}
          sizes="100vw"
          className="object-cover"
        />

        {hasHeroCopy && (
          <div
            className="absolute inset-0 z-[1] bg-black/40 pointer-events-none"
            aria-hidden
          />
        )}

        {slide.tag && (
          <span className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[2] bg-[#FFD700] text-[#0B0B0B] text-[11px] font-bold px-2.5 py-1.5 rounded-md shadow-lg border border-[#E6C200]">
            {slide.tag}
          </span>
        )}

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] h-full flex items-center py-10">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left text-[#FFFFFF] max-w-2xl"
          >
            <BadgePill label={slide.badge} />

            {slide.variant === 'welcome' ? (
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[2.85rem] font-bold leading-[1.12] tracking-tight text-[#FFFFFF] drop-shadow-sm">
                ¡BIENVENIDOS A{' '}
                <span className="text-[#FFD700]">MUNDOTECH</span>!
              </h1>
            ) : (
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[2.85rem] font-bold leading-[1.1] tracking-tight text-[#FFFFFF] whitespace-pre-line drop-shadow-sm">
                {slide.title}
              </h1>
            )}

            <p className="mt-3 text-[15px] sm:text-[16px] leading-relaxed max-w-lg mx-auto lg:mx-0 text-[#FFFFFF] font-medium drop-shadow-sm">
              {slide.sub}
            </p>

            <div className="mt-6 flex items-center gap-3 justify-center lg:justify-start flex-wrap">
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 bg-[#FFD700] text-[#0B0B0B] font-bold px-6 h-12 rounded-md text-sm hover:bg-[#FFE03A] shadow-md hover:shadow-lg transition-all border border-[#E6C200]"
              >
                {slide.cta} <ArrowRight size={15} aria-hidden />
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-[#FFFFFF] font-semibold px-5 h-12 rounded-md text-sm hover:bg-white/15 transition-colors backdrop-blur-[2px]"
              >
                Ver todo el catálogo
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-4 justify-center lg:justify-start flex-wrap">
              {[
                { icon: ShieldCheck, text: 'Garantía oficial' },
                { icon: Truck,       text: 'Envío seguro' },
              ].map((t) => (
                <span
                  key={t.text}
                  className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-[#FFFFFF] font-medium drop-shadow-sm"
                >
                  <t.icon size={13} className="text-[#FFD700]" aria-hidden />
                  {t.text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir al slide ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? 'w-6 bg-[#FFD700]' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#0B0B0B] border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]">
          <div className="flex items-center justify-around sm:justify-center sm:gap-10 py-3 overflow-x-auto scrollbar-hide">
            {[
              { icon: ShieldCheck, text: 'Garantía oficial' },
              { icon: Truck,       text: 'Envíos rápidos' },
              { icon: Tag,         text: 'Mejores precios' },
            ].map((item) => (
              <span
                key={item.text}
                className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-[#FFFFFF] font-medium whitespace-nowrap px-2"
              >
                <item.icon size={13} className="text-[#FFD700]" aria-hidden />
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
