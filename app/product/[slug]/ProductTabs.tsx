'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Settings2, Truck, Star, MessageSquareText } from 'lucide-react';
import { Stars } from '@/components/reviews/Stars';
import type { ProductSpec } from '@/lib/definitions';

interface Props {
  description: string | null;
  brand?: string | null;
  category: string;
  sku?: string | null;
  isOut: boolean;
  stock: number;
  specs?: ProductSpec[] | null;
  /** PRD-037: resumen real de reseñas — la tab deja de decir "Próximamente". */
  reviewsCount?: number;
  reviewsAverage?: number;
}

const tabs = [
  { id: 'description', label: 'Descripción',     icon: FileText  },
  { id: 'specs',       label: 'Especificaciones', icon: Settings2 },
  { id: 'shipping',    label: 'Envío',            icon: Truck     },
  { id: 'reviews',     label: 'Reseñas',          icon: Star      },
] as const;

type TabId = (typeof tabs)[number]['id'];

/**
 * PRD-053: la descripción puede traer HTML (imports CSV / pegado desde otra
 * web). En vez de mostrar las etiquetas literalmente, las convertimos a texto
 * plano con saltos de línea — sin `dangerouslySetInnerHTML` (cero riesgo XSS).
 */
function htmlToPlainText(value: string): string {
  if (!/[<>]/.test(value)) return value;
  return value
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function ProductTabs({
  description,
  brand,
  category,
  sku,
  isOut,
  stock,
  specs,
  reviewsCount = 0,
  reviewsAverage = 0,
}: Props) {
  const [active, setActive] = useState<TabId>('description');
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  // PRD-054: navegación por teclado del patrón WAI-ARIA Tabs
  // (flechas ←/→, Home/End; activación automática al mover el foco).
  const onKeyDown = (e: React.KeyboardEvent, current: TabId) => {
    const idx = tabs.findIndex((t) => t.id === current);
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabs.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const next = tabs[nextIdx].id;
    setActive(next);
    tabRefs.current.get(next)?.focus();
  };

  const plainDescription = description ? htmlToPlainText(description) : '';

  const scrollToReviews = () => {
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Información del producto"
        className="flex items-center gap-1 px-3 sm:px-5 pt-3 border-b border-slate-100 overflow-x-auto scrollbar-hide"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, tab.id)}
              className={`relative inline-flex items-center gap-2 px-4 h-12 text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 rounded-t-lg ${
                isActive ? 'text-navy' : 'text-slate-500 hover:text-navy'
              }`}
            >
              <tab.icon size={15} aria-hidden />
              {tab.label}
              {tab.id === 'reviews' && reviewsCount > 0 && (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 nums">
                  {reviewsCount}
                </span>
              )}
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
            role="tabpanel"
            id={`tabpanel-${active}`}
            aria-labelledby={`tab-${active}`}
            tabIndex={0}
            className="focus:outline-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {active === 'description' && (
              <p className="text-[15px] text-slate-600 leading-relaxed text-pretty whitespace-pre-line">
                {plainDescription || 'Este producto aún no tiene una descripción detallada. Pronto añadiremos más información.'}
              </p>
            )}

            {active === 'specs' && (
              <dl className="divide-y divide-slate-100">
                {/* Especificaciones técnicas reales (del campo specs) */}
                {specs && specs.length > 0 && specs.map((spec, i) => (
                  <div key={i} className="flex justify-between py-3 gap-4">
                    <dt className="text-sm text-slate-500 shrink-0">{spec.name}</dt>
                    <dd className="text-sm font-semibold text-navy text-right">{spec.value}</dd>
                  </div>
                ))}

                {/* Separador visual si hay specs técnicas + datos base */}
                {specs && specs.length > 0 && (brand || sku) && (
                  <div className="py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                      Información general
                    </p>
                  </div>
                )}

                {/* Datos base siempre presentes */}
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

                {/* Estado vacío si no hay ninguna spec técnica cargada */}
                {(!specs || specs.length === 0) && !brand && !sku && (
                  <div className="py-4 text-center">
                    <p className="text-sm text-slate-400">
                      Las especificaciones técnicas de este producto aún no están disponibles.
                    </p>
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

            {/* PRD-037: tab conectada al sistema real de reseñas (sección #reviews). */}
            {active === 'reviews' && (
              <div className="text-center py-6">
                {reviewsCount > 0 ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <Stars rating={reviewsAverage} size={18} />
                      <span className="text-lg font-bold text-navy nums">{reviewsAverage.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1.5">
                      {reviewsCount} {reviewsCount === 1 ? 'opinión de cliente' : 'opiniones de clientes'} sobre este producto.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-navy">Sé el primero en reseñar este producto</p>
                    <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">
                      Las reseñas ayudan a otros clientes a tomar una mejor decisión.
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={scrollToReviews}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy text-white text-sm font-semibold px-5 py-2.5 hover:bg-navy-700 active:scale-[0.98] transition-all"
                >
                  <MessageSquareText size={15} />
                  {reviewsCount > 0 ? 'Ver opiniones' : 'Escribir la primera reseña'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
