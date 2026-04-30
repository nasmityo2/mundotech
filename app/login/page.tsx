'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { z } from 'zod';

import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

const BRAND_RED = '#E31E24';

const loginSchema = z.object({
  email:    z.string().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.').min(8, 'Mínimo 8 caracteres.'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type FieldErrors   = Partial<Record<keyof LoginFormData, string>>;

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

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({});
  const [serverError, setServerError]   = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  const registrationSuccess = searchParams.get('registration') === 'success';
  const callbackUrl         = searchParams.get('callbackUrl') ?? '/';

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role === 'ADMIN') {
        router.push('/admin/products');
      } else {
        const raw = searchParams.get('callbackUrl');
        if (raw) {
          try {
            const url = new URL(raw);
            router.push(url.pathname + url.search);
          } catch {
            router.push(raw);
          }
        } else {
          router.push('/');
        }
      }
    }
  }, [status, session, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as keyof LoginFormData;
        if (!errors[f]) errors[f] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const result = await signIn('credentials', {
      redirect: false,
      email:    parsed.data.email,
      password: parsed.data.password,
    });
    setIsSubmitting(false);

    if (result?.error) {
      setServerError('Credenciales inválidas. Verifica tu correo y contraseña.');
    }
  };

  const inputFocusClass =
    'focus:!border-[#E31E24] focus:!shadow-[0_0_0_3px_rgba(227,30,36,0.25)] focus:!ring-0 focus:!bg-white/[0.12]';

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 py-10 text-center">
      {/* Fondo */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#121212]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-36 -right-36 h-[min(90vw,32rem)] w-[min(90vw,32rem)] rounded-full opacity-80 blur-[120px]"
          style={{ background: `radial-gradient(circle at center, ${BRAND_RED}33 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-40 -left-28 h-[min(85vw,28rem)] w-[min(85vw,28rem)] rounded-full opacity-70 blur-[100px]"
          style={{ background: `radial-gradient(circle at center, ${BRAND_RED}26 0%, transparent 72%)` }}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(227,30,36,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(227,30,36,0.12) 1px, transparent 1px),
              radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px, 48px 48px, 20px 20px',
            backgroundPosition: '0 0, 0 0, 10px 10px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md shrink-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={[
            'w-full rounded-3xl border border-white/10',
            'bg-white/[0.07] backdrop-blur-xl',
            'shadow-2xl shadow-black/50',
            'px-6 py-8 sm:px-8 sm:py-9',
            'text-left',
          ].join(' ')}
        >
          <div className="mb-6 text-center">
            <Link
              href="/"
              className="inline-flex flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#E31E24] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
            >
              <span className="text-2xl font-bold tracking-tight text-white">
                Mundo
                <span className="text-brand-yellow">Tech</span>
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/45">
                Conectados Contigo
              </span>
            </Link>
          </div>

          <h1 className="text-center text-xl font-bold tracking-tight text-white sm:text-2xl">
            Iniciar sesión
          </h1>
          <p className="mt-1.5 text-center text-sm text-white/55">
            ¿Aún no tienes cuenta?{' '}
            <Link
              href="/register"
              className="font-semibold text-white hover:text-brand-yellow hover:underline"
            >
              Regístrate
            </Link>
          </p>

          <div className="mt-6 space-y-4 [&_label]:text-white/85 [&_.text-rose-600]:text-rose-300 [&_svg.text-rose-600]:text-rose-300 [&_.absolute]:text-white/40">
            {registrationSuccess && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                <span>Cuenta creada. Inicia sesión para continuar.</span>
              </div>
            )}

            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/15 px-4 py-3 text-sm text-rose-100"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-300" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field id="email" label="Correo electrónico" leading={<Mail size={15} />} error={fieldErrors.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="Correo electrónico"
                  invalid={!!fieldErrors.email}
                  className={[
                    'pl-11 !border-white/15 !bg-white/[0.07] !text-white placeholder:!text-white/40',
                    invalidFocusOverride(fieldErrors.email),
                    inputFocusClass,
                  ].join(' ')}
                />
              </Field>

              <Field
                id="password"
                label="Contraseña"
                leading={<Lock size={15} />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    className="p-1 text-white/45 transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
                error={fieldErrors.password}
              >
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="Mínimo 8 caracteres"
                  invalid={!!fieldErrors.password}
                  className={[
                    'pl-11 pr-11 !border-white/15 !bg-white/[0.07] !text-white placeholder:!text-white/40',
                    invalidFocusOverride(fieldErrors.password),
                    inputFocusClass,
                  ].join(' ')}
                />
              </Field>

              <div className="flex justify-end -mt-2">
                <Link
                  href="#"
                  className="text-xs font-medium text-white/45 transition-colors hover:text-white"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                style={{ backgroundColor: BRAND_RED }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>

            {googleAvailable ? (
              <>
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/12" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-white/35"> o </span>
                  <div className="h-px flex-1 bg-white/12" />
                </div>

                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl })}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl border border-white/12 bg-white/[0.04] text-sm font-medium text-white/90 transition-colors hover:bg-white/[0.08] active:scale-[0.99]"
                >
                  <GoogleMark className="h-5 w-5" />
                  Continuar con Google
                </button>
              </>
            ) : null}

            <p className="mt-6 text-center text-[11px] text-white/35">
              Conexión cifrada · Protección CSRF activa
            </p>
          </div>
        </motion.div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/40">
          Tecnología Premium en Barquisimeto
        </p>
      </div>
    </div>
  );
}

function invalidFocusOverride(error: string | undefined) {
  if (error) {
    return '!border-rose-400/80 focus:!border-rose-400 focus:!shadow-[0_0_0_3px_rgba(251,113,133,0.2)]';
  }
  return '';
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
