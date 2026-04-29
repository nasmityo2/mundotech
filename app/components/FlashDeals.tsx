'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Zap, ArrowRight, ChevronRight } from 'lucide-react';

interface FlashProduct {
  id:            string;
  slug?:         string | null;
  name:          string;
  price:         number;
  originalPrice?: number | null;
  images:        string[];
  category:      string;
  brand?:        string | null;
  stock:         number;
}

interface Props {
  products: FlashProduct[];
  title?:   string;
  endHour?: number;
}

function useCountdown(targetHour: number) {
  // null hasta después del mount: servidor y primer paint del cliente muestran 00:00:00
  // y evitan hydration mismatch (Date difiere entre SSR y hidratación).
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    const getSecondsLeft = () => {
      const now = new Date();
      const end = new Date();
      end.setHours(targetHour, 0, 0, 0);
      if (end <= now) end.setDate(end.getDate() + 1);
      return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
    };
    const tick = () => setSecs(getSecondsLeft());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHour]);

  const safe = secs ?? 0;
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return { h, m, s };
}

function DiscountBadge({ pct }: { pct: number }) {
  return (
    <span className="absolute left-2 top-2 z-10 rounded-full border border-[#E6C200] bg-brand-yellow px-2 py-0.5 text-[10px] font-bold text-navy transition-all duration-300 hover:scale-105 hover:ring-2 hover:ring-[#FFE566]/80">
      -{pct}%
    </span>
  );
}

function FlashCard({ product }: { product: FlashProduct }) {
  const href     = product.slug ? `/product/${product.slug}` : '/productos';
  const img      = product.images[0] || '/placeholder-product.png';
  const pct      = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const stockPct = Math.min(100, Math.max(10, (product.stock / 20) * 100));

  return (
    <Link
      href={href}
      className="group flex-shrink-0 w-[140px] sm:w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-2xl"
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        {pct > 0 && <DiscountBadge pct={pct} />}
        <Image
          src={img}
          alt={product.name}
          fill
          sizes="160px"
          quality={90}
          className="object-contain p-4 transition-transform duration-300 drop-shadow-[0_6px_20px_rgba(11,18,32,0.1)] group-hover:scale-105"
        />
      </div>
      <div className="p-2.5">
        <p className="text-[12px] text-slate-500 truncate">{product.brand || product.category}</p>
        <p className="text-[13px] font-semibold text-[#0f172a] leading-tight mt-0.5 line-clamp-2">
          {product.name}
        </p>
        <p className="text-[15px] font-bold text-[#FFD700] mt-1.5 nums">
          ${product.price.toLocaleString()}
        </p>
        {product.originalPrice && (
          <p className="text-[11px] text-slate-400 line-through nums">
            ${product.originalPrice.toLocaleString()}
          </p>
        )}
        {/* Stock bar */}
        <div className="mt-2">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-600 rounded-full transition-all"
              style={{ width: `${100 - stockPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
            {product.stock < 5 ? `¡Solo ${product.stock} quedan!` : 'Disponible'}
          </p>
        </div>
      </div>
    </Link>
  );
}

const FlashDeals = ({ products, title = 'Ofertas MundoTech', endHour = 23 }: Props) => {
  const { h, m, s } = useCountdown(endHour);
  if (products.length === 0) return null;

  return (
    <section className="bg-[#0B0B0B] rounded-2xl overflow-hidden border border-white/5 w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1 rounded-full border border-[#E6C200]/50 bg-brand-yellow px-2 sm:px-3 py-1.5 text-[11px] sm:text-[13px] font-bold text-navy flex-shrink-0">
            <Zap size={12} fill="currentColor" />
            <span className="hidden xs:inline">{title}</span>
            <span className="xs:hidden">Ofertas</span>
          </div>
          {/* Countdown */}
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-hidden">
            <span className="hidden sm:inline text-[11px] text-white/60 mr-1 flex-shrink-0">Termina en</span>
            {[h, m, s].map((val, i) => (
              <span key={i} className="flex items-center gap-0.5 sm:gap-1">
                <span className="bg-white/10 text-white text-[11px] sm:text-[13px] font-bold tabular-nums w-6 sm:w-9 text-center py-1 rounded-md">
                  {val}
                </span>
                {i < 2 && <span className="text-white/50 font-bold text-xs sm:text-sm">:</span>}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/productos"
          className="flex items-center gap-1 text-[11px] sm:text-[12px] font-semibold text-brand-yellow flex-shrink-0 min-h-[44px] px-1"
        >
          <span className="hidden xs:inline">Ver todas</span>
          <span className="xs:hidden">Ver</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Cards scroll */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x-mandatory px-3 sm:px-6 py-4 sm:py-5">
        {products.map((p) => (
          <div key={p.id} className="snap-start flex-shrink-0">
            <FlashCard product={p} />
          </div>
        ))}
        <Link
          href="/productos"
          className="flex-shrink-0 w-[100px] sm:w-[120px] flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 text-white/70 text-[12px] font-semibold hover:bg-white/5 active:bg-white/10 transition-colors min-h-[140px] snap-start"
        >
          <ArrowRight size={20} />
          Ver más
        </Link>
      </div>
    </section>
  );
};

export default FlashDeals;
