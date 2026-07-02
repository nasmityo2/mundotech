'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingCart, Zap, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { stashLoginRedirectForPathname } from '@/lib/auth-path';
import type { Product } from '@/context/ProductContext';

/**
 * Barra de compra fija en móvil (regresión del 15 jun: se eliminó junto a
 * "fix fotos movil" y la PDP quedó sin CTA visible tras el scroll largo de
 * tabs/reseñas/relacionados). Aparece pasado el bloque de acciones principal.
 * Sin framer-motion: transición CSS (menos JS en la ruta más visitada).
 */
export default function StickyAddToCart({ product }: { product: Product }) {
  const { addToCart, silentAddToCart } = useCart();
  const { status } = useSession();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (product.stock === 0) return null;

  const handleAdd = () => {
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  const handleBuyNow = () => {
    silentAddToCart(product, 1);
    if (status !== 'authenticated') {
      stashLoginRedirectForPathname('/checkout');
      router.push('/login');
      return;
    }
    router.push('/checkout');
  };

  return (
    <div
      aria-hidden={!visible}
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 pt-2.5 shadow-[0_-4px_24px_-4px_rgba(11,18,32,0.15)] transition-transform duration-300 motion-reduce:transition-none ${
        visible ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative w-12 h-12 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
          <Image
            src={product.image || '/placeholder-product.png'}
            alt={product.name}
            fill
            sizes="48px"
            className="object-contain p-1"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-500 line-clamp-1">{product.name}</p>
          <p className="text-base font-bold text-navy nums tracking-tight leading-tight">
            {formatCurrency(product.price)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          tabIndex={visible ? 0 : -1}
          className={`min-w-[48px] min-h-[48px] rounded-xl border flex items-center justify-center active:scale-95 motion-reduce:active:scale-100 transition-all ${
            justAdded
              ? 'bg-brand-green border-brand-green text-white'
              : 'bg-white border-slate-200 text-navy hover:bg-slate-50 active:bg-slate-100'
          }`}
          aria-label={justAdded ? 'Agregado al carrito' : 'Agregar al carrito'}
        >
          {justAdded ? <Check size={17} /> : <ShoppingCart size={17} />}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          tabIndex={visible ? 0 : -1}
          className="inline-flex items-center justify-center gap-1.5 bg-brand-yellow text-navy font-bold text-sm min-h-[48px] px-4 rounded-xl hover:bg-[#FFE03A] active:scale-[0.98] motion-reduce:active:scale-100 shadow-soft transition-all whitespace-nowrap"
        >
          <Zap size={15} /> Comprar ahora
        </button>
      </div>
    </div>
  );
}
