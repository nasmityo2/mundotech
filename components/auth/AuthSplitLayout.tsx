'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, Truck, Wallet, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Propuestas de valor reales de la tienda (no claims genéricos). Reflejan la
 * operación concreta de MundoTech en Barquisimeto: garantía, doble moneda,
 * logística nacional y atención humana.
 */
const VALUE_PROPS: { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Garantía oficial',
    detail: 'Respaldo real en cada equipo y accesorio.',
  },
  {
    icon: Wallet,
    title: 'Pagas en USD o Bs.',
    detail: 'Tasa del día, pago móvil, transferencia o Binance.',
  },
  {
    icon: Truck,
    title: 'Envío a toda Venezuela',
    detail: 'Despacho seguro por MRW/Zoom o retiro en tienda.',
  },
  {
    icon: Store,
    title: 'Tienda física en Barquisimeto',
    detail: 'C.C. Minicentro 34, Calle 22 — Lara.',
  },
];

export type AuthSplitVariant = 'login' | 'register' | 'recovery';

interface AuthSplitLayoutProps {
  variant: AuthSplitVariant;
  breadcrumbLast: string;
  children: React.ReactNode;
}

const COPY: Record<AuthSplitVariant, { headline: string; subtext: string }> = {
  login: {
    headline: 'Tu cuenta MundoTech',
    subtext:
      'Entra para seguir tus pedidos, guardar favoritos y comprar más rápido la próxima vez.',
  },
  register: {
    headline: 'Crea tu cuenta MundoTech',
    subtext:
      'Únete a la comunidad tech de Barquisimeto: catálogo curado, precios en USD/Bs. y soporte cercano.',
  },
  recovery: {
    headline: 'Recupera tu acceso',
    subtext:
      'Te enviamos un enlace seguro de un solo uso. Tu cuenta sigue protegida en todo momento.',
  },
};

export default function AuthSplitLayout({
  variant,
  breadcrumbLast,
  children,
}: AuthSplitLayoutProps) {
  const { headline, subtext } = COPY[variant];

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

      {/* Mobile: franja de marca compacta con el eslogan real */}
      <div className="lg:hidden relative overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-card">
        <div className="absolute inset-0 circuit-bg opacity-[0.5]" aria-hidden />
        <div className="absolute -top-20 -right-12 h-44 w-44 rounded-full bg-brand-yellow/20 blur-3xl" aria-hidden />
        <div className="relative px-5 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            Mundo<span className="text-brand-yellow">Tech</span>
          </Link>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-yellow/90">
            Conectados Contigo
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/70">{subtext}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
        {/* Panel de marca — cyber-tech MundoTech */}
        <aside className="hidden lg:flex lg:col-span-5 relative overflow-hidden rounded-3xl border border-white/10 bg-navy-900 flex-col justify-between min-h-[560px]">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700" aria-hidden />
          <div className="absolute inset-0 circuit-bg opacity-60" aria-hidden />
          <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay" aria-hidden />
          <div className="absolute -top-24 -right-20 h-[360px] w-[360px] rounded-full bg-brand-yellow/12 blur-3xl" aria-hidden />
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-brand-yellow/40 to-transparent" aria-hidden />

          {/* Marca + eslogan */}
          <div className="relative p-10 pb-4">
            <Link href="/" className="inline-flex items-baseline text-2xl font-bold tracking-tight text-white">
              Mundo<span className="text-brand-yellow">Tech</span>
            </Link>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-yellow/90">
              Conectados Contigo
            </p>
          </div>

          {/* Mensaje + propuestas de valor */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative px-10 flex-1 flex flex-col justify-center"
          >
            <h2 className="text-[1.7rem] xl:text-[2rem] font-bold leading-tight tracking-tight text-white text-balance">
              {headline}
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/70 text-pretty">
              {subtext}
            </p>

            <ul className="mt-8 space-y-4">
              {VALUE_PROPS.map(({ icon: Icon, title, detail }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-yellow/25 bg-brand-yellow/10 text-brand-yellow">
                    <Icon size={16} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-white leading-snug">{title}</p>
                    <p className="text-[12.5px] text-white/55 leading-snug">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pie del panel */}
          <p className="relative px-10 pb-10 pt-6 text-[11px] text-white/40">
            © {new Date().getFullYear()} MundoTech · Tecnología en Barquisimeto, Venezuela
          </p>
        </aside>

        {/* Formulario */}
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
