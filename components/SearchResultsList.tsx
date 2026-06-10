'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Loader2, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { SearchResult } from '@/lib/search-shared';

interface Props {
  query: string;
  results: SearchResult[];
  isPending: boolean;
  onPick?: () => void;
  /** compact = dropdown; relaxed = overlay móvil */
  density?: 'compact' | 'relaxed';
}

export default function SearchResultsList({
  query,
  results,
  isPending,
  onPick,
  density = 'compact',
}: Props) {
  const pad = density === 'relaxed' ? 'px-3 py-3.5' : 'px-2.5 py-2.5';
  const img = density === 'relaxed' ? 'w-14 h-14' : 'w-12 h-12';

  if (isPending && results.length === 0 && query.trim().length >= 2) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
        <Loader2 size={18} className="animate-spin" />
        Buscando…
      </div>
    );
  }

  if (results.length === 0 && !isPending) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-semibold text-navy">Sin resultados para “{query}”</p>
        <p className="text-xs text-slate-500 mt-1">Intenta con otro nombre o categoría</p>
      </div>
    );
  }

  return (
    <>
      <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Resultados
      </p>
      <ul className="px-1.5 pb-2" role="listbox">
        {results.map((product) => (
          <li key={product.id} role="option">
            <Link
              href={`/product/${product.slug ?? product.id}`}
              onClick={onPick}
              className={`flex items-center gap-3 ${pad} rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors min-h-[52px]`}
            >
              <div
                className={`relative ${img} flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100`}
              >
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes={density === 'relaxed' ? '56px' : '48px'}
                    className="object-contain p-1.5"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag size={16} className="text-slate-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {product.brand && (
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide truncate">
                    {product.brand}
                  </p>
                )}
                <p className="text-sm font-semibold text-navy truncate leading-tight">
                  {product.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{product.category}</p>
              </div>

              <span className="text-sm font-bold text-navy flex-shrink-0 nums">
                {formatCurrency(product.price)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/buscar?q=${encodeURIComponent(query)}`}
        onClick={onPick}
        className="flex items-center justify-center gap-2 px-4 py-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors text-sm font-semibold text-navy border-t border-slate-100 min-h-[52px]"
      >
        Ver todos los resultados
        <ArrowRight size={14} />
      </Link>
    </>
  );
}
