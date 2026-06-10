'use client';

import { useState, useTransition } from 'react';
import { ShoppingCart, Zap, Minus, Plus, Heart, Check, Bell, BellOff, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { stashLoginRedirectForPathname } from '@/lib/auth-path';
import { subscribeRestockAction } from '@/app/actions/restockActions';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  images: string[];
  category: string;
  description: string;
  details: Record<string, string>;
  slug?: string | null;
}

export default function ProductActions({ product }: { product: Product }) {
  const { addToCart, silentAddToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Restock form state
  const [restockEmail, setRestockEmail]     = useState('');
  const [restockStatus, setRestockStatus]   = useState<'idle' | 'success' | 'error'>('idle');
  const [restockMessage, setRestockMessage] = useState('');
  const [isPending, startTransition]        = useTransition();

  const isOut = product.stock === 0;
  const max   = Math.min(product.stock, 10);
  const isFav = isInWishlist(product.id);

  const handleAdd = () => {
    if (isOut) return;
    addToCart(product as never, qty);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  const handleBuyNow = () => {
    if (isOut) return;
    if (status !== 'authenticated') {
      silentAddToCart(product as never, qty);
      stashLoginRedirectForPathname('/checkout');
      router.push('/login');
      return;
    }
    silentAddToCart(product as never, qty);
    router.push('/checkout');
  };

  const handleWishlist = () => {
    if (isFav) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product as never);
    }
  };

  const handleRestockSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const email = restockEmail.trim() || session?.user?.email?.trim() || '';
    if (!email) {
      setRestockStatus('error');
      setRestockMessage('Ingresa tu email para recibir el aviso.');
      return;
    }
    startTransition(async () => {
      const result = await subscribeRestockAction(email, product.id);
      setRestockStatus(result.success ? 'success' : 'error');
      setRestockMessage(result.message);
      if (result.success) setRestockEmail('');
    });
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Selector de cantidad */}
        {!isOut && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] sm:text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Cantidad
            </span>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full overflow-hidden">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-navy transition-colors disabled:opacity-30"
                disabled={qty <= 1}
                aria-label="Reducir cantidad"
              >
                <Minus size={14} />
              </button>
              <span className="w-12 text-center text-sm font-bold text-navy nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(max, q + 1))}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-navy transition-colors disabled:opacity-30"
                disabled={qty >= max}
                aria-label="Aumentar cantidad"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        {/* CTAs principales */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOut}
            className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-navy font-bold text-sm min-h-[52px] px-6 rounded-2xl shadow-soft hover:shadow-card hover:bg-[#FFE03A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Zap size={16} />
            Comprar ahora
          </button>
          <button
            type="button"
            onClick={handleWishlist}
            className={`inline-flex items-center justify-center gap-2 min-h-[52px] sm:min-w-[52px] sm:px-0 px-5 rounded-2xl border transition-all active:scale-[0.97] ${
              isFav
                ? 'bg-rose-50 border-rose-200 text-rose-500'
                : 'bg-white border-slate-200 text-slate-500 hover:text-navy hover:border-slate-300'
            }`}
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={18} className={isFav ? 'fill-rose-500' : ''} />
            <span className="sm:hidden text-sm font-semibold">
              {isFav ? 'Favorito' : 'Favoritos'}
            </span>
          </button>
        </div>

        {!isOut && (
          <button
            type="button"
            onClick={handleAdd}
            className={`w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl text-sm font-semibold transition-all border active:scale-[0.98] ${
              justAdded
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-navy border-navy/15 hover:border-navy hover:bg-slate-50'
            }`}
          >
            {justAdded ? (
              <>
                <Check size={16} /> ¡Ya está en tu carrito!
              </>
            ) : (
              <>
                <ShoppingCart size={16} /> ¡Me lo llevo!
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Formulario "Avísame cuando haya stock" ── */}
      {isOut && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {restockStatus === 'success' ? (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <BellOff size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">¡Listo! Te avisaremos.</p>
                <p className="mt-0.5 text-xs text-slate-500">{restockMessage}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRestockSubscribe} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="flex-shrink-0 text-amber-500" />
                <p className="text-sm font-semibold text-navy">
                  Avísame cuando esté disponible
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Te escribimos por email apenas vuelva a la tienda. Sin spam, solo el aviso.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={restockEmail || (session?.user?.email ?? '')}
                  onChange={(e) => setRestockEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy placeholder-slate-400 outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 disabled:opacity-60"
                  disabled={isPending}
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-w-[80px] items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-navy/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    'Avisar'
                  )}
                </button>
              </div>
              {restockStatus === 'error' && (
                <p className="text-xs text-rose-600">{restockMessage}</p>
              )}
            </form>
          )}
        </div>
      )}
    </>
  );
}
