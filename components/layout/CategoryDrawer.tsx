'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Clock, Zap, Sparkles, Tag } from 'lucide-react';
import { useProducts } from '@/context/ProductContext';
import { useRouter }   from 'next/navigation';

interface PromoData {
  title:        string;
  subtitle:     string | null;
  discountText: string | null;
  imageUrl:     string | null;
  bgColor:      string;
  link:         string;
}

interface CategoryDrawerProps {
  open:    boolean;
  onClose: () => void;
}

// ─── Countdown ──────────────────────────────────────────────────────────────

function Countdown({ targetHours }: { targetHours: number }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const end = Date.now() + targetHours * 3_600_000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetHours]);

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="font-mono font-bold tracking-wider nums">
      {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
    </span>
  );
}

// ─── Fallback ────────────────────────────────────────────────────────────────

const FALLBACK_PROMO: PromoData = {
  title:        'Hasta 30% de descuento',
  subtitle:     'En consolas, gadgets y tech seleccionados',
  discountText: 'Hasta 30%',
  imageUrl:     null,
  bgColor:      '#0B1220',
  link:         '/productos',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CategoryDrawer({ open, onClose }: CategoryDrawerProps) {
  const { products, setFilterCategory } = useProducts();
  const router = useRouter();
  const [promo, setPromo] = useState<PromoData | null>(null);
  const firstCatRef = useRef<HTMLButtonElement>(null);

  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  useEffect(() => {
    fetch('/api/promotions?active=true')
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data) && data.length > 0) setPromo(data[0] as PromoData);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstCatRef.current?.focus(), 180);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCategoryClick = (cat: string) => {
    setFilterCategory(cat);
    onClose();
    router.push('/productos');
  };

  const display = promo ?? FALLBACK_PROMO;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop button */}
          <motion.button
            type="button"
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[55] bg-navy/45 backdrop-blur-[2px] sm:backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            aria-label="Cerrar menú"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de categorías"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 h-[100dvh] w-[88vw] max-w-[340px] bg-white z-[56] flex flex-col shadow-lift overscroll-contain"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 sm:px-5 min-h-[60px] border-b border-slate-100 flex-shrink-0">
              <Link
                href="/"
                onClick={onClose}
                className="text-lg font-bold tracking-tight text-navy flex items-center gap-0.5"
              >
                <span>Mundo</span>
                <span className="text-brand-yellow">Tech</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] -mr-2 rounded-xl flex items-center justify-center text-slate-500 hover:text-navy hover:bg-slate-100 active:bg-slate-200 transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Body scrollable ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">

              {/* Banner Promo */}
              <div className="m-4">
                <div
                  className="relative overflow-hidden rounded-2xl p-5 text-white"
                  style={{ backgroundColor: display.bgColor }}
                >
                  <div className="absolute inset-0 mesh-light opacity-60 pointer-events-none" />
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-yellow/15 rounded-full pointer-events-none" />

                  <div className="relative">
                    <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/15 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3">
                      <Sparkles size={10} className="text-brand-yellow" />
                      Promo MundoTech
                    </span>

                    <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3 ml-2">
                      <Clock size={10} />
                      <Countdown targetHours={48} />
                    </div>

                    <h3 className="text-white font-bold text-lg leading-tight mb-1.5 tracking-tight">
                      {display.title}
                    </h3>

                    {display.subtitle && (
                      <p className="text-white/65 text-xs leading-relaxed mb-4">
                        {display.subtitle}
                      </p>
                    )}

                    <Link
                      href={display.link}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 bg-brand-yellow text-navy text-xs font-bold px-4 h-9 rounded-xl hover:bg-[#FFE03A] shadow-soft transition-all"
                    >
                      <Zap size={12} /> Ver oferta
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Sección: Categorías ──────────────────────────── */}
              <div className="px-4 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 px-2">
                  Categorías
                </p>
              </div>

              <ul className="px-2 pb-3 space-y-0.5">
                <li>
                  <button
                    type="button"
                    ref={firstCatRef}
                    onClick={() => handleCategoryClick('all')}
                    className="flex items-center gap-3 w-full px-3 min-h-[52px] rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-navy group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-yellowSft text-navy flex items-center justify-center flex-shrink-0">
                      <Tag size={15} />
                    </div>
                    <span className="flex-1 text-left text-[15px] font-semibold">
                      Todos los productos
                    </span>
                    <ChevronRight size={15} className="text-slate-300 group-hover:text-navy transition-colors flex-shrink-0" />
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(cat)}
                      className="flex items-center gap-3 w-full px-3 min-h-[48px] rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-navy group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                        {cat.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left text-[14px] font-medium capitalize truncate">
                        {cat}
                      </span>
                      <ChevronRight size={15} className="text-slate-300 group-hover:text-navy transition-colors flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
              <p className="text-[11px] text-slate-500 text-center">
                Tecnología premium · Garantía oficial
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
