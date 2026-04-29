'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Settings2, Truck, Star } from 'lucide-react';

interface Props {
  description: string | null;
  brand?: string | null;
  category: string;
  sku?: string | null;
  isOut: boolean;
  stock: number;
}

const tabs = [
  { id: 'description', label: 'Descripción',     icon: FileText  },
  { id: 'specs',       label: 'Especificaciones', icon: Settings2 },
  { id: 'shipping',    label: 'Envío',            icon: Truck     },
  { id: 'reviews',     label: 'Reseñas',          icon: Star      },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function ProductTabs({
  description,
  brand,
  category,
  sku,
  isOut,
  stock,
}: Props) {
  const [active, setActive] = useState<TabId>('description');

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
      {/* Tab strip */}
      <div className="flex items-center gap-1 px-3 sm:px-5 pt-3 border-b border-slate-100 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`relative inline-flex items-center gap-2 px-4 h-12 text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive ? 'text-navy' : 'text-slate-500 hover:text-navy'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute -bottom-px left-3 right-3 h-[3px] bg-navy rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6 sm:p-8 min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {active === 'description' && (
              <p className="text-[15px] text-slate-600 leading-relaxed text-pretty whitespace-pre-line">
                {description || 'Este producto aún no tiene una descripción detallada. Pronto añadiremos más información.'}
              </p>
            )}

            {active === 'specs' && (
              <dl className="divide-y divide-slate-100">
                {brand && (
                  <div className="flex justify-between py-3">
                    <dt className="text-sm text-slate-500">Marca</dt>
                    <dd className="text-sm font-semibold text-navy">{brand}</dd>
                  </div>
                )}
                <div className="flex justify-between py-3">
                  <dt className="text-sm text-slate-500">Categoría</dt>
                  <dd className="text-sm font-semibold text-navy capitalize">{category}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-sm text-slate-500">Disponibilidad</dt>
                  <dd className={`text-sm font-semibold ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isOut ? 'Agotado' : `En stock (${stock} unidades)`}
                  </dd>
                </div>
                {sku && (
                  <div className="flex justify-between py-3">
                    <dt className="text-sm text-slate-500">SKU</dt>
                    <dd className="text-sm font-mono text-slate-700">{sku}</dd>
                  </div>
                )}
              </dl>
            )}

            {active === 'shipping' && (
              <div className="space-y-4 text-[15px] text-slate-600 leading-relaxed">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-navy mb-1">Despacho 24-48 hs</p>
                    <p className="text-[13px] text-slate-500">Una vez confirmado el pago. Trackeable.</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-navy mb-1">Devolución 7 días</p>
                    <p className="text-[13px] text-slate-500">Si llega con defectos o no es lo esperado.</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-navy mb-1">Cobertura nacional</p>
                    <p className="text-[13px] text-slate-500">MRW, Tealca y otros couriers a tu ciudad.</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-navy mb-1">Garantía oficial</p>
                    <p className="text-[13px] text-slate-500">Productos originales con respaldo del fabricante.</p>
                  </div>
                </div>
              </div>
            )}

            {active === 'reviews' && (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-navy">Sé el primero en reseñar este producto</p>
                <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">
                  Las reseñas ayudan a otros clientes a tomar una mejor decisión. Próximamente activaremos
                  esta función.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
