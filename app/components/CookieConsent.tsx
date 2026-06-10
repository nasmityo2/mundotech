'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';

type Consent = 'accepted' | 'essential';

const STORAGE_KEY = 'mt_cookie_consent';
const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;

/**
 * Consentimiento de cookies + carga condicional de GA4.
 * Google Analytics solo se inyecta si el usuario aceptó cookies de medición
 * y `NEXT_PUBLIC_GA4_ID` está configurado. Sin dark patterns: rechazar es
 * igual de fácil que aceptar.
 */
export default function CookieConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted' || stored === 'essential') {
        setConsent(stored);
      }
    } catch {
      setConsent('essential');
    }
    setReady(true);
  }, []);

  const choose = (value: Consent) => {
    setConsent(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* sin persistencia: la elección vale para esta visita */
    }
  };

  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const showBanner = ready && consent === null && !isAdmin;

  return (
    <>
      {consent === 'accepted' && GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      ) : null}

      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Aviso de cookies"
            className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lift sm:flex sm:items-center sm:gap-4 sm:p-5"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-start gap-3 sm:flex-1">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-yellowSft text-navy">
                <Cookie size={17} aria-hidden />
              </span>
              <p className="text-[12.5px] leading-relaxed text-slate-600">
                Usamos cookies para que el carrito y tu sesión funcionen, y — solo
                si aceptas — para medir visitas y mejorar la tienda.{' '}
                <Link
                  href="/privacy-policy#cookies"
                  className="font-semibold text-navy underline decoration-brand-yellow decoration-2 underline-offset-2"
                >
                  Más detalles
                </Link>
              </p>
            </div>
            <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
              <button
                type="button"
                onClick={() => choose('essential')}
                className="min-h-[40px] flex-1 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-navy transition-colors hover:bg-slate-50 sm:flex-none"
              >
                Solo lo necesario
              </button>
              <button
                type="button"
                onClick={() => choose('accepted')}
                className="min-h-[40px] flex-1 rounded-xl border border-brand-yellowDk bg-brand-yellow px-4 text-[13px] font-black text-navy transition-all hover:bg-[#FFE03A] active:scale-[0.98] sm:flex-none"
              >
                Aceptar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
