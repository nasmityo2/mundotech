'use client';

import { useState } from 'react';
import Image from 'next/image';
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
  const activeItem = safeItems[active];

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-[96px]">
      <div
        className={cn(
          'relative w-full aspect-square overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50',
          'shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)] transition-shadow duration-300',
        )}
      >
        <Image
          key={`${activeItem.url}-${active}`}
          src={activeItem.url}
          alt={name}
          fill
          priority={active === 0}
          fetchPriority={active === 0 ? 'high' : 'auto'}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-6 sm:p-8 animate-fade-up bg-slate-50"
        />

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
                    src={item.url}
                    alt={`${name} vista ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
