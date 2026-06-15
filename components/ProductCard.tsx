'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Check } from 'lucide-react';
import { useCart }     from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useState }    from 'react';
import type { Product } from '../context/ProductContext';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { Stars } from '@/components/reviews/Stars';
import { isGenericBrand } from '@/lib/utils';

function formatUSD(amount: number): string {
  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatBs(amount: number, rate: number): string {
  const bs = amount * rate;
  return `Bs. ${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bs)}`;
}

/**
 * PRD-114: el card usa el patrón "stretched link" — el enlace vive en el
 * título y se extiende con un pseudo-elemento sobre toda la tarjeta. Los
 * botones (wishlist / carrito) quedan FUERA del enlace (HTML válido, sin
 * controles interactivos anidados) elevados con z-10.
 */
const ProductCard = ({ product, priority = false }: { product: Product; priority?: boolean }) => {
  const { addToCart }                                      = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { rate, stale }                                    = useExchangeRate();
  const [justAdded, setJustAdded] = useState(false);

  const isFav      = isInWishlist(product.id);
  const isOut      = product.stock === 0;
  const isLowStock = !isOut && product.stock <= 5;
  const brandLabel = !isGenericBrand(product.brand) ? product.brand : null;

  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleWishlist = () => {
    if (isFav) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleCart = () => {
    if (isOut) return;
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <div className="group block h-full">
      <div className="card-interactive relative flex h-full flex-col overflow-hidden focus-within:ring-2 focus-within:ring-navy active:scale-[0.99] motion-reduce:active:scale-100">

        {/* Imagen */}
        <div className="relative aspect-[4/5] overflow-hidden bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority={priority}
            fetchPriority={priority ? 'high' : undefined}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={priority ? 75 : 90}
            className="object-contain p-4 sm:p-6 transition-transform duration-500 drop-shadow-[0_6px_18px_rgba(11,18,32,0.10)] group-hover:scale-[1.04]"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[60%]">
            {discountPct ? (
              <span className="rounded-md border border-[#E6C200] bg-[#FFD700] px-2 py-0.5 text-[10px] font-bold text-[#0B0B0B] shadow-soft">
                -{discountPct}%
              </span>
            ) : product.isNew ? (
              <span className="rounded-md border border-white/10 bg-[#0B0B0B] px-2 py-0.5 text-[10px] font-bold text-white shadow-soft">
                Nuevo
              </span>
            ) : null}

            {isLowStock && (
              <span className="bg-white text-[#0f172a] border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-soft truncate">
                Quedan {product.stock}
              </span>
            )}
          </div>

          {/* Wishlist — fuera del link (PRD-114), por encima del overlay */}
          <button
            type="button"
            onClick={handleWishlist}
            className="absolute z-10 top-1.5 right-1.5 min-w-[44px] min-h-[44px] rounded-full bg-white/90 backdrop-blur
                       border border-slate-200/70 shadow-soft flex items-center justify-center
                       text-slate-400 hover:text-rose-500 active:text-rose-600 active:scale-95 hover:bg-white transition-all"
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={16} aria-hidden="true" className={isFav ? 'text-rose-500 fill-rose-500' : ''} />
          </button>

          {/* Overlay agotado */}
          {isOut && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
              <span className="bg-white text-navy text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 shadow-soft">
                Agotado
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4 flex flex-col flex-grow gap-1.5">
          {brandLabel ? (
            <span className="chip-brand w-fit max-w-full truncate">
              {brandLabel}
            </span>
          ) : null}

          <h3 className="text-[13px] sm:text-sm font-semibold text-navy leading-snug line-clamp-2 transition-colors min-h-[2.4rem]">
            <Link
              href={`/product/${product.slug ?? product.id}`}
              className="focus:outline-none after:absolute after:inset-0 after:content-[''] after:rounded-2xl"
            >
              {product.name}
            </Link>
          </h3>

          {/* Rating — solo cuando hay reseñas reales aprobadas */}
          {product.reviewCount && product.reviewCount > 0 ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Stars rating={product.rating ?? 0} size={11} />
              <span className="text-[10px] text-on-light ml-0.5 nums">({product.reviewCount})</span>
            </div>
          ) : null}

          {/* Precio */}
          <div className="mt-auto pt-2 sm:pt-3">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[1.25rem] sm:text-[1.45rem] font-bold text-navy tracking-tight nums leading-none">
                {formatUSD(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-[11px] sm:text-xs text-on-light line-through nums">
                  {formatUSD(product.originalPrice)}
                </span>
              )}
            </div>
            <p
              className="text-[10px] sm:text-[11px] text-on-light mt-0.5 nums truncate"
              title={stale ? 'Referencia en bolívares — se confirma al pagar' : undefined}
            >
              {formatBs(product.price, rate)}
              {/* PRD-215: la tasa mostrada no se pudo refrescar — monto referencial */}
              {stale ? <span className="text-on-light"> (ref.)</span> : null}
            </p>

            <button
              type="button"
              onClick={handleCart}
              disabled={isOut}
              className={`relative z-10 mt-2.5 sm:mt-3 w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-full
                          text-[12px] sm:text-[13px] font-bold transition-all duration-200 border
                          active:scale-[0.97] motion-reduce:active:scale-100
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${justAdded
                            ? 'bg-navy text-white border-navy'
                            : 'bg-brand-yellow text-navy border-brand-yellowDk hover:bg-[#FFE03A] active:bg-[#FFD024] shadow-soft hover:shadow-card'}`}
            >
              {justAdded ? (
                <>
                  <Check size={15} aria-hidden="true" />
                  ¡En el carrito!
                </>
              ) : (
                <>
                  <ShoppingCart size={14} aria-hidden="true" />
                  {isOut ? 'Agotado' : '¡Me lo llevo!'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
