import { Suspense } from 'react';
import type { Metadata } from 'next';

import RegistroClient from './RegistroClient';
import {
  computeLoginLandingFromSources,
  resolveSearchParamGetter,
} from '@/lib/auth-path';
import { readAndConsumeLoginReturnCookiePath } from '@/lib/login-return-cookie';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Regístrate en MundoTech para comprar con garantía y seguimiento de pedidos.',
};

function RegistroFallback() {
  return (
    <div className="min-h-[45vh] rounded-3xl border border-slate-200/80 bg-white/60 animate-pulse" />
  );
}

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegistroPage(props: PageProps) {
  const resolved = props.searchParams ? await props.searchParams : {};
  const getParam = resolveSearchParamGetter(resolved);
  const cookiePath = await readAndConsumeLoginReturnCookiePath();
  const landing = computeLoginLandingFromSources(getParam, cookiePath);

  return (
    <Suspense fallback={<RegistroFallback />}>
      <RegistroClient serverCallbackUrl={landing.callbackUrl} />
    </Suspense>
  );
}
