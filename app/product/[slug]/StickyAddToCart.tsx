'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingCart, Zap } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import LoginRequiredModal from '@/components/LoginRequiredModal';

interface Props {
  product: {
    id:    string;
    name:  string;
    price: number;
    image: string;
    stock: number;
  };
}

export default function StickyAddToCart({ product }: Props) {
  const { addToCart, silentAddToCart } = useCart();
  const { status } = useSession();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 360);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isOut = product.stock === 0;

  const handleBuyNow = () => {
    if (isOut) return;
    if (status !== 'authenticated') {
      setShowLoginModal(true);
      return;
    }
    silentAddToCart(product as never);
    router.push('/checkout');
  };

  return (
    <>
      {showLoginModal && (
        <LoginRequiredModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            silentAddToCart(product as never);
            router.push('/checkout');
          }}
        />
      )}

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 pt-2.5 shadow-[0_-4px_24px_-4px_rgba(11,18,32,0.15)]"
            style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative w-12 h-12 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                <Image src={product.image} alt={product.name} fill sizes="48px" className="object-contain p-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-500 line-clamp-1">{product.name}</p>
                <p className="text-base font-bold text-navy nums tracking-tight leading-tight">
                  {formatCurrency(product.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addToCart(product as never, 1)}
                disabled={isOut}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-200 text-navy flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 active:scale-95 transition-all"
                aria-label="Agregar al carrito"
              >
                <ShoppingCart size={16} />
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOut}
                className="inline-flex items-center gap-1.5 bg-brand-yellow text-navy font-bold text-sm min-h-[44px] px-3.5 rounded-xl hover:bg-[#FFE03A] active:scale-95 shadow-soft disabled:opacity-50 transition-all"
              >
                <Zap size={14} /> Comprar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
