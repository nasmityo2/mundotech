'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

const bullets = [
  'Productos originales',
  'Entrega rápida',
  'Soporte confiable',
] as const;

export type AuthSplitVariant = 'login' | 'register';

interface AuthSplitLayoutProps {
  variant: AuthSplitVariant;
  breadcrumbLast: string;
  children: React.ReactNode;
}

export default function AuthSplitLayout({
  variant,
  breadcrumbLast,
  children,
}: AuthSplitLayoutProps) {
  const headline =
    variant === 'login'
      ? 'Bienvenido de nuevo'
      : 'Tu tecnología, en un solo lugar';
  const subtext =
    variant === 'login'
      ? 'Accede a tu cuenta para seguir pedidos, favoritos y checkout rápido.'
      : 'Crea tu cuenta y compra con confianza: catálogo curado, envíos trackeables y soporte humano.';

  return (
    <div className="w-full space-y-6">
      <nav className="text-sm text-slate-500" aria-label="Migas de pan">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li>
            <Link href="/" className="font-medium hover:text-navy transition-colors">
              Inicio
            </Link>
          </li>
          <li className="text-slate-300" aria-hidden>
            /
          </li>
          <li>
            <span className="text-slate-400">Cuenta</span>
          </li>
          <li className="text-slate-300" aria-hidden>
            /
          </li>
          <li className="font-semibold text-navy">{breadcrumbLast}</li>
        </ol>
      </nav>

      {/* Mobile: branding compacto */}
      <div className="lg:hidden rounded-2xl overflow-hidden border border-slate-200/80 shadow-soft bg-gradient-to-br from-navy-900 via-navy to-navy-700">
        <div className="relative px-5 py-4 mesh-light">
          <div className="absolute inset-0 bg-noise opacity-[0.22] mix-blend-overlay pointer-events-none" />
          <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-brand-yellow/18 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-2">
            <Link href="/" className="text-lg font-bold tracking-tight text-white">
              Mundo<span className="text-brand-yellow">Tech</span>
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 border border-white/15">
              <Sparkles size={10} className="text-brand-yellow shrink-0" />
              Tienda tech
            </span>
          </div>
          <p className="relative mt-1 text-xs text-white/70">{headline}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
        <aside className="hidden lg:flex lg:col-span-5 relative overflow-hidden rounded-3xl border border-white/10 flex-col justify-between min-h-[520px]">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy to-navy-700" />
          <div className="absolute inset-0 mesh-light opacity-90 pointer-events-none" />
          <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 circuit-bg opacity-[0.14] mix-blend-soft-light pointer-events-none" />
          <div className="absolute -top-28 -right-24 w-[380px] h-[380px] rounded-full bg-brand-yellow/14 blur-3xl pointer-events-none" />

          <div className="relative p-10 pb-6">
            <Link href="/" className="inline-flex text-2xl font-bold tracking-tight text-white">
              Mundo<span className="text-brand-yellow">Tech</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative px-10 flex-1 flex flex-col justify-center"
          >
            <span className="inline-flex w-fit items-center gap-2 bg-white/10 backdrop-blur border border-white/15 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white mb-4">
              <Sparkles size={12} className="text-brand-yellow" />
              Compra con garantía · 2026
            </span>
            <h2 className="text-3xl xl:text-[2rem] font-bold tracking-tight text-white leading-tight">
              {headline}
            </h2>
            <p className="mt-4 text-[15px] text-white/70 leading-relaxed max-w-sm">{subtext}</p>

            <ul className="mt-8 space-y-3">
              {bullets.map((text) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15 border border-brand-yellow/25 text-brand-yellow">
                    <Check size={15} strokeWidth={2.5} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </motion.div>

          <p className="relative px-10 pb-10 text-[11px] text-white/45">
            © {new Date().getFullYear()} MundoTech · Barquisimeto y envíos a Venezuela
          </p>
        </aside>

        <div className="lg:col-span-7 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-6 sm:p-8"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
