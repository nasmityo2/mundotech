'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { stashLoginRedirectForPathname } from '@/lib/auth-path';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const CartDrawer = () => {
  const {
    cart, isCartLoading, removeFromCart, updateQuantity,
    getCartTotal, isCartOpen, closeCart,
  } = useCart();
  const router           = useRouter();
  const { status }       = useSession();

  // Block body scroll while drawer is open (iOS-safe)
  useEffect(() => {
    if (!isCartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isCartOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCartOpen, closeCart]);

  const handleCheckout = () => {
    if (status !== 'authenticated') {
      closeCart();
      stashLoginRedirectForPathname('/checkout');
      router.push('/login');
      return;
    }
    closeCart();
    router.push('/checkout');
  };

  return (
    <>
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop separate from panel — clicks here close drawer */}
            <motion.button
              type="button"
              key="cart-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCart}
              aria-label="Cerrar carrito"
              className="fixed inset-0 z-[65] bg-navy/45 backdrop-blur-[2px] sm:backdrop-blur-sm cursor-pointer"
            />

            {/* Panel — does NOT inherit clicks from backdrop */}
            <motion.aside
              key="cart-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Carrito de compras"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 z-[66] flex h-[100dvh] w-full sm:max-w-md flex-col bg-white border-l border-slate-200 shadow-lift overscroll-contain"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 min-h-[60px] border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-navy text-brand-yellow flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={16} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-navy tracking-tight truncate">Tu carrito</h2>
                    <p className="text-[11px] text-slate-500">
                      {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  className="min-w-[44px] min-h-[44px] -mr-2 rounded-xl flex items-center justify-center text-slate-500 hover:text-navy hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  aria-label="Cerrar carrito"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              {isCartLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-slate-500">Cargando carrito…</p>
                </div>
              ) : cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-4">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                    <ShoppingBag size={32} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-navy">Tu carrito está vacío</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Cuando agregues productos aparecerán aquí.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="mt-2 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 min-h-[48px] rounded-xl hover:bg-navy-700 shadow-soft hover:shadow-card transition-all"
                  >
                    Explorar productos <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 space-y-2 min-h-0">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="relative w-20 h-20 flex-shrink-0 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                        <Image
                          src={item.image || item.images?.[0] || '/placeholder-product.png'}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-contain p-2"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-navy leading-snug line-clamp-2 flex-1 min-w-0">
                            {item.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-slate-300 hover:text-rose-500 active:text-rose-600 transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1.5"
                            aria-label="Eliminar"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center bg-white border border-slate-200 rounded-full overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-navy hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-30"
                              aria-label="Reducir cantidad"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-[2rem] text-center text-xs font-bold text-navy nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-navy hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-30"
                              aria-label="Aumentar cantidad"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <p className="text-sm font-bold text-navy nums whitespace-nowrap">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              {!isCartLoading && cart.length > 0 && (
                <div className="border-t border-slate-100 bg-white flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <div className="px-4 sm:px-5 py-3.5 space-y-1.5">
                    <div className="flex justify-between items-center text-sm text-slate-500">
                      <span>Subtotal</span>
                      <span className="nums">{formatCurrency(getCartTotal())}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-500">
                      <span>Envío</span>
                      <span className="text-emerald-600 font-medium">Calculado al pagar</span>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                      <span className="text-sm font-semibold text-navy">Total estimado</span>
                      <span className="text-2xl font-bold text-navy nums tracking-tight">
                        {formatCurrency(getCartTotal())}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 sm:px-5 pt-1 space-y-2">
                    <button
                      type="button"
                      onClick={handleCheckout}
                      className="w-full inline-flex items-center justify-center gap-2 bg-brand-yellow text-navy min-h-[52px] rounded-2xl text-sm font-bold hover:bg-[#FFE03A] active:scale-[0.99] shadow-soft hover:shadow-card transition-all"
                    >
                      Proceder al pago <ArrowRight size={16} />
                    </button>
                    <Link href="/cart" onClick={closeCart} className="block">
                      <span className="w-full bg-white text-navy min-h-[48px] rounded-2xl text-sm font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors border border-slate-200 inline-flex items-center justify-center">
                        Ver carrito completo
                      </span>
                    </Link>
                    <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-400">
                      <ShieldCheck size={12} className="text-emerald-500" />
                      Pago Móvil · Transferencia · Binance
                    </p>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartDrawer;
