'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Check, Star } from 'lucide-react';
import { useCart }     from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useState }    from 'react';
import type { Product } from '../context/ProductContext';
import { useExchangeRate } from '../context/ExchangeRateContext';

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

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart }                                      = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { rate }                                           = useExchangeRate();
  const [justAdded, setJustAdded] = useState(false);

  const isFav      = isInWishlist(product.id);
  const isOut      = product.stock === 0;
  const isLowStock = !isOut && product.stock <= 5;
  const brandLabel = product.brand ?? product.category;

  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFav) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOut) return;
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <Link
      href={`/product/${product.slug ?? product.id}`}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-2xl"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-soft
                      transition-all duration-300 active:scale-[0.99] hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-card">

        {/* Imagen */}
        <div className="relative aspect-[4/5] overflow-hidden bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={90}
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

          {/* Wishlist — siempre visible, 40px touch */}
          <button
            type="button"
            onClick={handleWishlist}
            className="absolute top-1.5 right-1.5 min-w-[40px] min-h-[40px] rounded-full bg-white/90 backdrop-blur
                       border border-slate-200/70 shadow-soft flex items-center justify-center
                       text-slate-400 hover:text-rose-500 active:text-rose-600 active:scale-95 hover:bg-white transition-all"
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={16} className={isFav ? 'text-rose-500 fill-rose-500' : ''} />
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
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">
            {brandLabel}
          </p>

          <h3 className="text-[13px] sm:text-sm font-medium text-[#0f172a] leading-snug line-clamp-2 transition-colors min-h-[2.4rem]">
            {product.name}
          </h3>

          {/* Rating — se muestra solo cuando hay reseñas reales */}
          <div className="flex items-center gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={11}
                className="text-slate-200 fill-slate-200"
              />
            ))}
            <span className="text-[10px] text-slate-400 ml-1">Sé el primero en calificar</span>
          </div>

          {/* Precio */}
          <div className="mt-auto pt-2 sm:pt-3">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[1.15rem] sm:text-[1.3rem] font-bold text-navy tracking-tight nums leading-none">
                {formatUSD(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-[11px] sm:text-xs text-slate-400 line-through nums">
                  {formatUSD(product.originalPrice)}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 nums truncate">
              {formatBs(product.price, rate)}
            </p>

            <button
              type="button"
              onClick={handleCart}
              disabled={isOut}
              className={`mt-2.5 sm:mt-3 w-full inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[44px] rounded-xl
                          text-[12px] sm:text-[13px] font-bold transition-all duration-200 border
                          active:scale-[0.97]
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${justAdded
                            ? 'bg-navy text-white border-navy'
                            : 'bg-[#FFD700] text-[#0B0B0B] border-[#E6C200] hover:bg-[#FFE03A] active:bg-[#FFD024] shadow-sm'}`}
            >
              {justAdded ? (
                <>
                  <Check size={15} />
                  Agregado
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  {isOut ? 'Agotado' : 'Agregar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
