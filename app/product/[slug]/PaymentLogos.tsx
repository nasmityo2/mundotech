'use client';

import { useState } from 'react';
import Image from 'next/image';

const PAYMENT_LOGOS = [
  { alt: 'Pago Móvil',    src: '/payments/pago-movil.png' },
  { alt: 'Zelle',         src: '/payments/zelle.png' },
  { alt: 'Binance',       src: '/payments/binance.png' },
  { alt: 'Cashea',        src: '/payments/cashea.png' },
  { alt: 'Transferencia', src: '/payments/transferencia.png' },
  { alt: 'Efectivo',      src: '/payments/efectivo.png' },
] as const;

function PaymentLogoItem({ alt, src }: { alt: string; src: string }) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={80}
      height={28}
      className="h-[22px] w-auto opacity-90 transition-opacity hover:opacity-100 sm:h-[26px]"
      onError={() => setHidden(true)}
    />
  );
}

export default function PaymentLogos() {
  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-on-light">
        Métodos de pago
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {PAYMENT_LOGOS.map((logo) => (
          <PaymentLogoItem key={logo.src} alt={logo.alt} src={logo.src} />
        ))}
      </div>
    </div>
  );
}
