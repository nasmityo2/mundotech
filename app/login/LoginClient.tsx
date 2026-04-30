'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import PremiumAuthCard, { safeInternalPath } from '@/components/auth/PremiumAuthCard';
import { toast } from '@/components/ui/use-toast';
import type { AuthTab } from '@/lib/auth-modal-schema';

export default function LoginClient() {
  const router           = useRouter();
  const params           = useSearchParams();
  const { status, data: session } = useSession();
  const toastedRegistered = useRef(false);

  const callbackUrl       = params.get('callbackUrl') ?? '/';
  const tabParam          = params.get('tab');
  const initialTab: AuthTab = tabParam === 'register' ? 'register' : 'login';

  useEffect(() => {
    if (status !== 'authenticated' || !session) return;
    const role = session.user?.role?.toUpperCase?.();
    const dest = safeInternalPath(callbackUrl);
    if (role === 'ADMIN') router.replace('/admin/products');
    else router.replace(dest || '/');
  }, [status, session, router, callbackUrl]);

  useEffect(() => {
    if (toastedRegistered.current) return;
    const ok =
      params.get('registered') === '1' ||
      params.get('registration') === 'success';
    if (!ok) return;
    toastedRegistered.current = true;
    toast({
      title:       'Cuenta creada',
      description: 'Inicia sesión para continuar.',
    });
  }, [params]);

  const areaMin =
    'min-h-[calc(100dvh-60px)] sm:min-h-[calc(100dvh-104px)]';

  if (status === 'loading') {
    return (
      <div
        className={`${areaMin} flex items-center justify-center bg-[#0B0F14]`}
      >
        <div
          className="h-8 w-8 rounded-full border-2 border-[#FFD600]/30 border-t-[#FFD600] animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div
        className={`${areaMin} flex items-center justify-center bg-[#0B0F14]`}
      >
        <p className="text-white/50 text-sm">Redirigiendo…</p>
      </div>
    );
  }

  return (
    <div
      className={`relative flex ${areaMin} w-full flex-col items-center justify-center px-4 py-10 bg-[#0B0F14]`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -top-24 left-1/2 h-[min(70vw,28rem)] w-[min(70vw,28rem)] -translate-x-1/2 rounded-full bg-[#FFD600]/12 blur-[100px]"
          animate={{ opacity: [0.45, 0.65, 0.45] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[60vw] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <PremiumAuthCard callbackUrl={callbackUrl} initialTab={initialTab} />

      <p className="relative mt-8 text-center text-[11px] text-white/35">
        Tecnología premium · Barquisimeto y envíos a Venezuela
      </p>
    </div>
  );
}
