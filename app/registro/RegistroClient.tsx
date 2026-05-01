'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

import AuthSplitLayout from '@/components/auth/AuthSplitLayout';
import { AuthRegisterForm } from '@/components/auth/MundoTechAuthForms';
import { safeInternalPath } from '@/lib/auth-path';
import { Loader2 } from 'lucide-react';

export default function RegistroClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, data: session } = useSession();

  const callbackUrl = params.get('callbackUrl') ?? '/';

  useEffect(() => {
    if (status !== 'authenticated' || !session) return;
    const role = session.user?.role?.toUpperCase?.();
    const dest = safeInternalPath(callbackUrl);
    if (role === 'ADMIN') router.replace('/admin/products');
    else router.replace(dest || '/');
  }, [status, session, router, callbackUrl]);

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
    <AuthSplitLayout variant="register" breadcrumbLast="Registro">
      <AuthRegisterForm callbackUrl={callbackUrl} />
    </AuthSplitLayout>
  );
}
