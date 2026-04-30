'use client';

import {
  forwardRef,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Loader2,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  authLoginSchema,
  authRegisterSchema,
  type AuthLoginValues,
  type AuthRegisterValues,
} from '@/lib/auth-modal-schema';
import { registerUserAction } from '@/app/actions/authActions';
import { toast } from '@/components/ui/use-toast';
import type { AuthModalTab } from '@/context/AuthModalContext';

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function passwordStrengthLabel(pw: string) {
  if (!pw) return { score: 0, label: '' as const };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ['Débil', 'Regular', 'Buena', 'Fuerte'] as const;
  return { score, label: labels[Math.max(0, score - 1)] ?? '' };
}

function safeInternalPath(raw: string): string {
  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (typeof window !== 'undefined' && u.origin !== window.location.origin) return '/';
    return `${u.pathname}${u.search}`;
  } catch {
    return '/';
  }
}

const inputBase =
  'w-full min-h-[48px] rounded-xl border bg-white/[0.05] text-white placeholder:text-white/35 outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50';

interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingPadding?: boolean;
  trailingPadding?: boolean;
}

const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ invalid, leadingPadding, trailingPadding, className, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        inputBase,
        leadingPadding && 'pl-11',
        trailingPadding && 'pr-11',
        invalid
          ? 'border-rose-400/70 focus:border-rose-400 focus:shadow-[0_0_0_3px_rgba(251,113,133,0.18)]'
          : 'border-white/10 focus:border-[#FFD600]/55 focus:shadow-[0_0_0_3px_rgba(255,214,0,0.18)] focus:bg-white/[0.07]',
        className,
      )}
      {...props}
    />
  ),
);
PremiumInput.displayName = 'PremiumInput';

interface AuthModalProps {
  open: boolean;
  tab: AuthModalTab;
  callbackUrl: string;
  setTab: (t: AuthModalTab) => void;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => boolean;
}

export default function AuthModal({
  open,
  tab: ctxTab,
  callbackUrl,
  setTab,
  onOpenChange,
  onAuthenticated,
}: AuthModalProps) {
  const router                              = useRouter();
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [shakeLogin, setShakeLogin]       = useState(false);
  const [shakeRegister, setShakeRegister] = useState(false);
  const [loginShowPwd, setLoginShowPwd]   = useState(false);
  const [regShowPwd, setRegShowPwd]       = useState(false);
  const [regShowConfirm, setRegShowConfirm] = useState(false);

  const loginForm = useForm<AuthLoginValues>({
    resolver:      zodResolver(authLoginSchema),
    mode:          'onChange',
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<AuthRegisterValues>({
    resolver:      zodResolver(authRegisterSchema),
    mode:          'onChange',
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const loginSubmitting    = loginForm.formState.isSubmitting;
  const registerSubmitting = registerForm.formState.isSubmitting;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (!cancelled) setGoogleAvailable(Boolean(data?.google));
      })
      .catch(() => {
        if (!cancelled) setGoogleAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      if (ctxTab === 'login') document.getElementById('auth-email')?.focus();
      else document.getElementById('auth-name')?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, ctxTab]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const triggerShakeLogin = useCallback(() => {
    setShakeLogin(true);
    window.setTimeout(() => setShakeLogin(false), 480);
  }, []);

  const triggerShakeRegister = useCallback(() => {
    setShakeRegister(true);
    window.setTimeout(() => setShakeRegister(false), 480);
  }, []);

  const finishSuccess = useCallback(async () => {
    toast({
      title:       'Sesión iniciada',
      description: 'Bienvenido de nuevo a MundoTech.',
    });
    onOpenChange(false);
    router.refresh();
    const session = await getSession();
    const role    = session?.user?.role?.toUpperCase?.();

    if (role === 'ADMIN') {
      router.push('/admin/products');
      return;
    }

    const handledCustom = onAuthenticated();
    if (!handledCustom) {
      const dest = safeInternalPath(callbackUrl);
      if (dest !== '/') router.push(dest);
    }
  }, [callbackUrl, onAuthenticated, onOpenChange, router]);

  const onLoginSubmit: SubmitHandler<AuthLoginValues> = async (data) => {
    loginForm.clearErrors('root');
    const result = await signIn('credentials', {
      redirect: false,
      email:    data.email,
      password: data.password,
    });
    if (result?.error) {
      loginForm.setError('root', {
        message: 'Credenciales incorrectas o cuenta inexistente.',
      });
      triggerShakeLogin();
      return;
    }
    await finishSuccess();
  };

  const onRegisterSubmit: SubmitHandler<AuthRegisterValues> = async (data) => {
    registerForm.clearErrors('root');
    const res = await registerUserAction({
      name:     data.name,
      email:    data.email,
      password: data.password,
    });
    if (!res.success) {
      registerForm.setError('root', {
        message: res.message ?? 'No pudimos crear tu cuenta.',
      });
      triggerShakeRegister();
      return;
    }
    const signInResult = await signIn('credentials', {
      redirect: false,
      email:    data.email,
      password: data.password,
    });
    if (signInResult?.error) {
      toast({
        title:       'Cuenta creada',
        description: 'Ya puedes iniciar sesión con tu correo.',
      });
      setTab('login');
      loginForm.reset({ email: data.email, password: '' });
      window.requestAnimationFrame(() => document.getElementById('auth-password')?.focus());
      return;
    }
    await finishSuccess();
  };

  const pwWatch = registerForm.watch('password');
  const strength  = passwordStrengthLabel(pwWatch ?? '');

  const tabs = (
    <div className="grid grid-cols-2 gap-2">
      {(['login', 'register'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={cn(
            'min-h-[46px] rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
            ctxTab === t
              ? 'border border-[#FFD600]/40 bg-[#FFD600]/12 text-white shadow-[0_0_28px_-14px_rgba(255,214,0,0.65)]'
              : 'border border-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/75',
          )}
        >
          {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="auth-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-x-0 bottom-0 top-[60px] sm:top-[104px] z-[88] flex items-center justify-center px-4 py-6 sm:py-10"
        >
          <motion.button
            type="button"
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0B0F14]/72 backdrop-blur-xl cursor-default"
            onClick={() => onOpenChange(false)}
          />

          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <motion.div
              className="absolute -top-24 left-1/2 h-[min(70vw,28rem)] w-[min(70vw,28rem)] -translate-x-1/2 rounded-full bg-[#FFD600]/12 blur-[100px]"
              animate={{ opacity: [0.45, 0.65, 0.45] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute bottom-0 right-0 h-[40vh] w-[60vw] rounded-full bg-indigo-600/10 blur-[120px]" />
          </div>

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-[1] w-full max-w-md rounded-2xl border border-white/10',
              'bg-[#111827]/85 backdrop-blur-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)]',
              'overflow-hidden flex flex-col max-h-[min(92dvh,760px)]',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-[#FFD600]/[0.03]" />

            <div className="relative flex items-start justify-between gap-3 p-6 md:p-8 pb-4 md:pb-5 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#FFD600]/25 bg-[#FFD600]/10 text-[#FFD600] shadow-[0_0_28px_-10px_rgba(255,214,0,0.55)]">
                  <ShoppingBag size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFD600]/85">
                    <Sparkles size={11} /> MundoTech
                  </p>
                  <h2 id="auth-modal-title" className="mt-1 text-lg md:text-xl font-bold tracking-tight text-white">
                    Entra sin salir de la tienda
                  </h2>
                  <p className="mt-1 text-[13px] text-white/50 leading-snug">
                    Acceso seguro · mismo catálogo · misma sesión de compra
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10',
                  'text-white/55 hover:text-white hover:bg-white/[0.06] hover:border-white/15',
                  'active:scale-[0.96] transition-all',
                )}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative px-6 md:px-8 pt-4 pb-6 md:pb-8 flex-1 overflow-y-auto overscroll-contain">
              <div className="mb-6">{tabs}</div>

              <AnimatePresence mode="wait" initial={false}>
                {ctxTab === 'login' ? (
                  <motion.div
                    key="login-pane"
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.form
                      animate={
                        shakeLogin
                          ? { x: [0, -7, 7, -5, 5, 0] }
                          : { x: 0 }
                      }
                      transition={{ duration: 0.42 }}
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      {loginForm.formState.errors.root && (
                        <div
                          role="alert"
                          className="flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-100"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                          {loginForm.formState.errors.root.message}
                        </div>
                      )}

                      <div>
                        <label htmlFor="auth-email" className="mb-1.5 block text-[12px] font-semibold text-white/75">
                          Correo electrónico
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
                            <Mail size={16} />
                          </span>
                          <PremiumInput
                            {...loginForm.register('email')}
                            id="auth-email"
                            type="email"
                            autoComplete="email"
                            leadingPadding
                            invalid={!!loginForm.formState.errors.email}
                            disabled={loginSubmitting}
                            placeholder="tu@correo.com"
                          />
                        </div>
                        {loginForm.formState.errors.email && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-300">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="auth-password" className="mb-1.5 block text-[12px] font-semibold text-white/75">
                          Contraseña
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
                            <Lock size={16} />
                          </span>
                          <PremiumInput
                            {...loginForm.register('password')}
                            id="auth-password"
                            type={loginShowPwd ? 'text' : 'password'}
                            autoComplete="current-password"
                            leadingPadding
                            trailingPadding
                            invalid={!!loginForm.formState.errors.password}
                            disabled={loginSubmitting}
                            placeholder="Tu contraseña"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"
                            onClick={() => setLoginShowPwd((v) => !v)}
                            aria-label="Mostrar u ocultar contraseña"
                          >
                            {loginShowPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-300">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end -mt-1">
                        <button
                          type="button"
                          className="text-xs font-medium text-white/45 transition-colors hover:text-[#FFD600]"
                          onClick={() =>
                            toast({
                              title:       'Recuperación de acceso',
                              description:
                                'Pronto podrás restablecer tu clave desde aquí. Mientras tanto, contacta a soporte.',
                            })
                          }
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={loginSubmitting}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          'mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl',
                          'bg-[#FFD600] text-[#0B0F14] text-sm font-bold tracking-tight',
                          'shadow-[0_12px_40px_-16px_rgba(255,214,0,0.65)] hover:shadow-[0_16px_48px_-12px_rgba(255,214,0,0.55)]',
                          'disabled:opacity-55 disabled:pointer-events-none transition-shadow',
                        )}
                      >
                        {loginSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Iniciando sesión…
                          </>
                        ) : (
                          'Iniciar sesión'
                        )}
                      </motion.button>
                    </motion.form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register-pane"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.form
                      animate={
                        shakeRegister
                          ? { x: [0, -7, 7, -5, 5, 0] }
                          : { x: 0 }
                      }
                      transition={{ duration: 0.42 }}
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      {registerForm.formState.errors.root && (
                        <div
                          role="alert"
                          className="flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-100"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                          {registerForm.formState.errors.root.message}
                        </div>
                      )}

                      <div>
                        <label htmlFor="auth-name" className="mb-1.5 block text-[12px] font-semibold text-white/75">
                          Nombre
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
                            <User size={16} />
                          </span>
                          <PremiumInput
                            {...registerForm.register('name')}
                            id="auth-name"
                            type="text"
                            autoComplete="name"
                            leadingPadding
                            invalid={!!registerForm.formState.errors.name}
                            disabled={registerSubmitting}
                            placeholder="Tu nombre"
                          />
                        </div>
                        {registerForm.formState.errors.name && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-300">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {registerForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="auth-r-email" className="mb-1.5 block text-[12px] font-semibold text-white/75">
                          Correo electrónico
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
                            <Mail size={16} />
                          </span>
                          <PremiumInput
                            {...registerForm.register('email')}
                            id="auth-r-email"
                            type="email"
                            autoComplete="email"
                            leadingPadding
                            invalid={!!registerForm.formState.errors.email}
                            disabled={registerSubmitting}
                            placeholder="tu@correo.com"
                          />
                        </div>
                        {registerForm.formState.errors.email && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-300">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="auth-r-password" className="mb-1.5 block text-[12px] font-semibold text-white/75">
                          Contraseña
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
                            <Lock size={16} />
                          </span>
                          <PremiumInput
                            {...registerForm.register('password')}
                            id="auth-r-password"
                            type={regShowPwd ? 'text' : 'password'}
                            autoComplete="new-password"
                            leadingPadding
                            trailingPadding
                            invalid={!!registerForm.formState.errors.password}
                            disabled={registerSubmitting}
                            placeholder="Mínimo 8 caracteres"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"
                            onClick={() => setRegShowPwd((v) => !v)}
                            aria-label="Mostrar u ocultar contraseña"
                          >
                            {regShowPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                        {registerForm.formState.errors.password && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-300">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      {pwWatch ? (
                        <div className="-mt-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((i) => (
                              <span
                                key={i}
                                className={cn(
                                  'h-1 flex-1 rounded-full transition-colors duration-300',
                                  i <= strength.score
                                    ? strength.score < 2
                                      ? 'bg-rose-400'
                                      : strength.score < 4
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400'
                                    : 'bg-white/10',
                                )}
                              />
                            ))}
                          </div>
                          <p className="mt-1.5 text-[11px] text-white/45">
                            Fuerza:{' '}
                            <span className="font-semibold text-[#FFD600]/90">{strength.label}</span>
                          </p>
                        </div>
                      ) : null}

                      <div>
                        <label htmlFor="auth-r-confirm" className="mb-1.5 block text-[12px] font-semibold text-white/75">
                          Confirmar contraseña
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
                            <Lock size={16} />
                          </span>
                          <PremiumInput
                            {...registerForm.register('confirmPassword')}
                            id="auth-r-confirm"
                            type={regShowConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            leadingPadding
                            trailingPadding
                            invalid={!!registerForm.formState.errors.confirmPassword}
                            disabled={registerSubmitting}
                            placeholder="Repite la contraseña"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 hover:text-white transition-colors"
                            onClick={() => setRegShowConfirm((v) => !v)}
                            aria-label="Mostrar u ocultar confirmación"
                          >
                            {regShowConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                        {registerForm.formState.errors.confirmPassword && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-300">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {registerForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <motion.button
                        type="submit"
                        disabled={registerSubmitting}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          'mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl',
                          'bg-[#FFD600] text-[#0B0F14] text-sm font-bold tracking-tight',
                          'shadow-[0_12px_40px_-16px_rgba(255,214,0,0.65)] hover:shadow-[0_16px_48px_-12px_rgba(255,214,0,0.55)]',
                          'disabled:opacity-55 disabled:pointer-events-none transition-shadow',
                        )}
                      >
                        {registerSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creando cuenta…
                          </>
                        ) : (
                          'Crear cuenta'
                        )}
                      </motion.button>

                      <p className="text-[11px] text-white/35 text-center leading-relaxed pt-1">
                        Al registrarte aceptas los términos y el tratamiento de datos de MundoTech.
                      </p>
                    </motion.form>
                  </motion.div>
                )}
              </AnimatePresence>

              {googleAvailable ? (
                <div className="relative mt-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      o continúa con
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() =>
                      signIn('google', { callbackUrl: safeInternalPath(callbackUrl) })
                    }
                    className={cn(
                      'flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl',
                      'border border-white/12 bg-white/[0.04] text-sm font-semibold text-white/90',
                      'hover:bg-white/[0.08] hover:border-white/18 transition-colors',
                    )}
                  >
                    <GoogleMark className="h-5 w-5" />
                    Continuar con Google
                  </motion.button>
                </div>
              ) : null}

              <p className="mt-6 text-center text-[10px] text-white/30 tracking-wide">
                Conexión cifrada · Sesión JWT · CSRF protegido
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
