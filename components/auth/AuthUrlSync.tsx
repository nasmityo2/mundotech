'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { useAuthModal } from '@/context/AuthModalContext';

/**
 * Abre el modal cuando la URL incluye `?auth=login` o `?auth=register`
 * (p. ej. tras redirect desde `/login` o enlaces externos).
 */
export default function AuthUrlSync() {
  const searchParams = useSearchParams();
  const router         = useRouter();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    const auth = searchParams.get('auth');
    if (auth !== 'login' && auth !== 'register') return;

    const callbackUrl = searchParams.get('callbackUrl') ?? '/';
    const registered  = searchParams.get('registered') === '1';

    openAuthModal({
      tab: auth === 'register' ? 'register' : 'login',
      callbackUrl,
    });

    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    url.searchParams.delete('callbackUrl');
    url.searchParams.delete('registration');
    url.searchParams.delete('registered');
    const qs = url.searchParams.toString();
    router.replace(`${url.pathname}${qs ? `?${qs}` : ''}`, { scroll: false });

    if (registered) {
      const t = window.setTimeout(() => {
        toast({
          title:       'Cuenta creada',
          description: 'Inicia sesión para continuar en la tienda.',
        });
      }, 280);
      return () => window.clearTimeout(t);
    }
  }, [searchParams, router, openAuthModal]);

  return null;
}
