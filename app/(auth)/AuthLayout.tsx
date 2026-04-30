'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Truck, Headset, Sparkles, ArrowLeft,
} from 'lucide-react';

interface AuthLayoutProps {
  /** Texto pequeño tipo eyebrow del panel izquierdo (opcional). */
  eyebrow?: string;
  /** Título principal del panel izquierdo. */
  brandTitle: string;
  /** Subtítulo / pitch del panel izquierdo. */
  brandSubtitle: string;
  /** Hijos del lado derecho — el formulario. */
  children: React.ReactNode;
}

const benefits = [
  { icon: ShieldCheck, text: 'Garantía oficial en cada compra' },
  { icon: Truck,       text: 'Envío trackeable a todo el país' },
  { icon: Headset,     text: 'Soporte humano cuando lo necesites' },
];

export default function AuthLayout({
  eyebrow = 'MundoTech · 2026',
  brandTitle,
  brandSubtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-5 sm:-my-8 lg:-my-10 min-h-[calc(100dvh-60px)] sm:min-h-[calc(100dvh-72px)] flex flex-col lg:grid lg:grid-cols-12 w-auto max-w-full overflow-x-hidden">

      {/* ── Panel branding (desktop) ── */}
      <aside className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-navy text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy to-navy-700" />
        <div className="absolute inset-0 mesh-light opacity-90" />
        <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" />
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-brand-yellow/15 blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-1.5 text-2xl font-bold tracking-tight">
            <span>DAY</span>
            <span className="text-brand-yellow">●</span>
            <span>ZO</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-md"
        >
          <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/15 rounded-full px-3 py-1.5 text-[11px] font-semibold mb-5">
            <Sparkles size={12} className="text-brand-yellow" />
            {eyebrow}
          </span>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            {brandTitle.split(' ').map((word, i, arr) =>
              i === arr.length - 1 ? (
                <span key={i} className="bg-gradient-to-r from-brand-yellow to-amber-300 bg-clip-text text-transparent">
                  {word}
                </span>
              ) : (
                <span key={i}>{word} </span>
              ),
            )}
          </h2>
          <p className="mt-4 text-white/65 text-[15px] leading-relaxed">{brandSubtitle}</p>

          <ul className="mt-7 space-y-3">
            {benefits.map((b) => (
              <li key={b.text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-yellow flex-shrink-0">
                  <b.icon size={15} />
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        </motion.div>

        <p className="relative text-[11px] text-white/40">
          © {new Date().getFullYear()} MundoTech. Tecnología premium en Barquisimeto y envíos seguros.
        </p>
      </aside>

      {/* ── Panel formulario (flex-1 en móvil centra el bloque en el viewport) ── */}
      <main className="flex-1 lg:flex-none col-span-1 lg:col-span-7 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14 bg-surface-sunken lg:bg-white">
        <div className="w-full max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium text-slate-500 hover:text-navy transition-colors mb-3"
          >
            <ArrowLeft size={13} /> Volver al inicio
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white lg:bg-transparent lg:shadow-none rounded-3xl border border-slate-200/80 lg:border-0 shadow-soft p-5 sm:p-8 lg:p-0"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
