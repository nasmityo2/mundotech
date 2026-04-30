'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from 'react';
import AuthModal from '@/components/auth/AuthModal';
import AuthUrlSync from '@/components/auth/AuthUrlSync';

export type AuthModalTab = 'login' | 'register';

export interface OpenAuthModalOptions {
  tab?: AuthModalTab;
  callbackUrl?: string;
  onAuthenticated?: () => void;
}

interface AuthModalContextValue {
  open: boolean;
  tab: AuthModalTab;
  openAuthModal: (opts?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  setTab: (t: AuthModalTab) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

function AuthModalProviderInner({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<AuthModalTab>('login');
  const [callbackUrl, setCallbackUrl] = useState('/');
  const onAuthenticatedRef = useRef<(() => void) | undefined>(undefined);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    onAuthenticatedRef.current = undefined;
  }, []);

  const openAuthModal = useCallback((opts?: OpenAuthModalOptions) => {
    setTab(opts?.tab ?? 'login');
    setCallbackUrl(opts?.callbackUrl ?? '/');
    onAuthenticatedRef.current = opts?.onAuthenticated;
    setOpen(true);
  }, []);

  const runAuthenticated = useCallback((): boolean => {
    const fn = onAuthenticatedRef.current;
    onAuthenticatedRef.current = undefined;
    if (fn) {
      fn();
      return true;
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({
      open,
      tab,
      openAuthModal,
      closeAuthModal,
      setTab,
    }),
    [open, tab, openAuthModal, closeAuthModal],
  );

  return (
    <AuthModalContext.Provider value={value}>
      <Suspense fallback={null}>
        <AuthUrlSync />
      </Suspense>
      {children}
      <AuthModal
        open={open}
        tab={tab}
        callbackUrl={callbackUrl}
        onOpenChange={(next) => {
          if (!next) closeAuthModal();
          else setOpen(true);
        }}
        setTab={setTab}
        onAuthenticated={runAuthenticated}
      />
    </AuthModalContext.Provider>
  );
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  return <AuthModalProviderInner>{children}</AuthModalProviderInner>;
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal debe usarse dentro de AuthModalProvider');
  return ctx;
}
