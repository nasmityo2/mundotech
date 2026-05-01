'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Package, Mail, Home } from 'lucide-react';
import type { EnrichedOrder } from './page';
import { formatStoredOrderMoney } from '@/lib/order-pricing';

interface Props {
  order: EnrichedOrder;
}

const fadeUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function SuccessClientPage({ order }: Props) {
  const m = (n: number) => formatStoredOrderMoney(n, order);
  const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  return (
    <div className="py-10 sm:py-14 max-w-3xl mx-auto">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {/* Hero éxito */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-8 sm:p-12 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="mx-auto w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lift"
          >
            <Check size={42} strokeWidth={3} />
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-3xl sm:text-4xl font-bold text-navy tracking-tight"
          >
            ¡Gracias por tu compra!
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-3 text-[15px] text-slate-500">
            Tu pedido ha sido confirmado y se está procesando.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-5 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-full">
            <Package size={14} className="text-navy/60" />
            <span className="text-xs text-slate-500">Pedido</span>
            <span className="font-mono text-sm font-semibold text-navy">
              #{String(order.orderNumber).padStart(4, '0')}
            </span>
          </motion.div>
        </motion.div>

        {/* Próximos pasos */}
        <motion.div
          variants={fadeUp}
          className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            { icon: Mail,    title: 'Pago en revisión',      sub: 'Verificaremos tu comprobante pronto' },
            { icon: Package, title: 'Preparando tu pedido',  sub: 'Te avisaremos cuando esté listo'     },
            { icon: Home,    title: 'Rastrea tu pedido',     sub: 'Consulta el estado en tu cuenta'     },
          ].map((step) => (
            <div key={step.title} className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-xl bg-brand-yellowSft text-navy flex items-center justify-center mb-2.5">
                <step.icon size={17} />
              </div>
              <p className="text-sm font-semibold text-navy">{step.title}</p>
              <p className="text-[12px] text-slate-500 mt-1 leading-snug">{step.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Resumen */}
        <motion.div
          variants={fadeUp}
          className="mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-navy">Resumen del pedido</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 px-5 py-3">
                <div className="relative w-14 h-14 flex-shrink-0 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                  <Image
                    src={item.imageUrl || '/placeholder.png'}
                    alt={item.productName}
                    fill
                    sizes="56px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{item.productName}</p>
                  <p className="text-[12px] text-slate-500">Cantidad: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-navy nums whitespace-nowrap">
                  {m(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="text-navy nums">{m(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Envío</span>
              <span className="text-emerald-600 font-medium">Gratis</span>
            </div>
            <div className="border-t border-slate-200 pt-2.5 mt-1.5 flex items-end justify-between">
              <span className="text-base font-semibold text-navy">Total</span>
              <span className="text-2xl font-bold text-navy nums tracking-tight">{m(order.total)}</span>
            </div>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="mt-7 flex flex-col sm:flex-row gap-3">
          <Link
            href="/account/orders"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-navy text-white font-bold text-sm h-12 rounded-2xl hover:bg-navy-700 shadow-soft hover:shadow-card transition-all"
          >
            Ver mis pedidos <ArrowRight size={15} />
          </Link>
          <Link
            href="/productos"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-navy font-semibold text-sm h-12 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Seguir comprando
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
