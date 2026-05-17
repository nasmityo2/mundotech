'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

import AuthSplitLayout from '@/components/auth/AuthSplitLayout';
import { AuthLoginForm } from '@/components/auth/MundoTechAuthForms';
import {
  readFreshStashedLoginRedirectPath,
  clearStashedLoginRedirectPath,
  resolveLoginCallbackFromParams,
  resolvePostLoginRedirect,
} from '@/lib/auth-path';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface Props {
  /** Destino desde servidor (URL legacy o cookie consumida una vez). */
  serverCallbackUrl: string;
}

export default function LoginClient({ serverCallbackUrl }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const { status, data: session } = useSession();
  const toastedRegistered = useRef(false);

  const [callbackUrl, setCallbackUrl] = useState(serverCallbackUrl);

  /** Orden: query explícita > sessionStorage cliente > servidor (cookie/etc.). */
  useEffect(() => {
    const nextOrCbExplicit =
      (params.get('next') ?? '').length > 0 || (params.get('callbackUrl') ?? '').length > 0;

    if (nextOrCbExplicit) {
      const urlBased = resolveLoginCallbackFromParams(params.get.bind(params));
      setCallbackUrl(urlBased !== '/' ? urlBased : '/');
      return;
    }

    const stashed = readFreshStashedLoginRedirectPath();
    if (stashed) {
      setCallbackUrl(stashed);
      return;
    }

    setCallbackUrl(serverCallbackUrl);
  }, [paramsKey, params, serverCallbackUrl]);

  useEffect(() => {
    if (params.get('tab') !== 'register') return;
    const q = new URLSearchParams(params.toString());
    q.delete('tab');
    const tail = q.toString();
    router.replace(tail ? `/registro?${tail}` : '/registro');
  }, [params, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !session) return;
    clearStashedLoginRedirectPath();
    const role = session.user?.role?.toUpperCase?.();
    router.replace(resolvePostLoginRedirect(role, callbackUrl));
  }, [status, session, router, callbackUrl]);

  useEffect(() => {
    if (toastedRegistered.current) return;
    const ok =
      params.get('registered') === '1' ||
      params.get('registration') === 'success';
    if (!ok) return;
    toastedRegistered.current = true;
    toast({
      title: 'Cuenta creada',
      description: 'Inicia sesión para continuar.',
      variant: 'success',
    });
  }, [params]);

  const defaultEmail =
    params.get('registered') === '1' && params.get('email')
      ? decodeURIComponent(params.get('email')!)
      : undefined;

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-9 w-9 animate-spin text-navy/40" aria-hidden />
        <p className="text-sm font-medium text-slate-500">Cargando sesión…</p>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" aria-hidden />
        <p className="text-sm text-slate-600">Redirigiendo…</p>
      </div>
    );
  }

  return (
    <AuthSplitLayout variant="login" breadcrumbLast="Login">
      <AuthLoginForm callbackUrl={callbackUrl} defaultEmail={defaultEmail} />
    </AuthSplitLayout>
  );
}
