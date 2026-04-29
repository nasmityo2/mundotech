'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { z } from 'zod';

import AuthLayout from '../(auth)/AuthLayout';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email:    z.string().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.').min(8, 'Mínimo 8 caracteres.'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type FieldErrors   = Partial<Record<keyof LoginFormData, string>>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrationSuccess = searchParams.get('registration') === 'success';

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

  return (
    <AuthLayout
      brandTitle="Bienvenido de vuelta a MundoTech"
      brandSubtitle="Accede a tu cuenta para revisar pedidos, gestionar tus favoritos y comprar más rápido la próxima vez."
    >
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-navy tracking-tight">Iniciar sesión</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          ¿Aún no tienes cuenta?{' '}
          <Link href="/register" className="text-navy font-semibold hover:underline">
            Regístrate
          </Link>
        </p>
      </div>

      {registrationSuccess && (
        <div role="status" className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 mb-5 rounded-xl text-sm">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Cuenta creada. Inicia sesión para continuar.</span>
        </div>
      )}

      {serverError && (
        <div role="alert" className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 mb-5 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
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
            placeholder="tu@email.com"
            invalid={!!fieldErrors.email}
            className="pl-11"
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
              className="hover:text-navy transition-colors p-1"
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
            className="pl-11 pr-11"
          />
        </Field>

        <div className="flex justify-end -mt-2">
          <Link href="#" className="text-xs font-medium text-slate-500 hover:text-navy transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm min-h-[52px] rounded-2xl hover:bg-navy-700 active:bg-navy-800 shadow-soft hover:shadow-card hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-1"
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

      <p className="text-center text-[11px] text-slate-400 mt-6">
        Conexión cifrada · Protección CSRF activa
      </p>
    </AuthLayout>
  );
}
