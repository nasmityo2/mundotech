import { Suspense } from 'react';
import type { Metadata } from 'next';
import RegistroClient from './RegistroClient';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Regístrate en MundoTech para comprar con garantía y seguimiento de pedidos.',
};

function RegistroFallback() {
  return (
    <div className="min-h-[45vh] rounded-3xl border border-slate-200/80 bg-white/60 animate-pulse" />
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<RegistroFallback />}>
      <RegistroClient />
    </Suspense>
  );
}
