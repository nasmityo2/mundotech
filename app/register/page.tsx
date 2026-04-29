'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { registerUserAction } from '@/app/actions/authActions';

import AuthLayout from '../(auth)/AuthLayout';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

const registerSchema = z
  .object({
    name:            z.string().min(1, 'El nombre es obligatorio.').min(2, 'Mínimo 2 caracteres.'),
    email:           z.string().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
    password:        z.string().min(1, 'La contraseña es obligatoria.').min(8, 'Mínimo 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Debes confirmar tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path:    ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;
type FieldErrors = Partial<Record<keyof RegisterFormData, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFieldError = (f: keyof FieldErrors) =>
    setFieldErrors((prev) => ({ ...prev, [f]: undefined }));

  const passwordStrength = (() => {
    if (!password) return { score: 0, label: '' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    const labels = ['Débil', 'Regular', 'Buena', 'Fuerte'];
    return { score, label: labels[Math.max(0, score - 1)] };
  })();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as keyof RegisterFormData;
        if (!errors[f]) errors[f] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const result = await registerUserAction({
      name:     parsed.data.name,
      email:    parsed.data.email,
      password: parsed.data.password,
    });
    setIsSubmitting(false);

    if (result.success) router.push('/login?registration=success');
    else setServerError(result.message || 'Ocurrió un error durante el registro.');
  };

  return (
    <AuthLayout
      brandTitle="Únete a la comunidad MundoTech"
      brandSubtitle="Crea tu cuenta en segundos para acceder a ofertas exclusivas, guardar favoritos y gestionar tus pedidos."
    >
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-navy tracking-tight">Crear cuenta</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-navy font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>

      {serverError && (
        <div role="alert" className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 mb-5 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field id="name" label="Nombre completo" leading={<User size={15} />} error={fieldErrors.name}>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
            placeholder="Tu nombre completo"
            invalid={!!fieldErrors.name}
            className="pl-11"
          />
        </Field>

        <Field id="email" label="Correo electrónico" leading={<Mail size={15} />} error={fieldErrors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            placeholder="Mínimo 8 caracteres"
            invalid={!!fieldErrors.password}
            className="pl-11 pr-11"
          />
        </Field>

        {/* Indicador fuerza */}
        {password && (
          <div className="-mt-2.5">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= passwordStrength.score
                      ? passwordStrength.score < 2
                        ? 'bg-rose-400'
                        : passwordStrength.score < 4
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Fuerza: <span className="font-semibold text-navy">{passwordStrength.label}</span>
            </p>
          </div>
        )}

        <Field
          id="confirmPassword"
          label="Confirmar contraseña"
          leading={<Lock size={15} />}
          trailing={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
              className="hover:text-navy transition-colors p-1"
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
          error={fieldErrors.confirmPassword}
        >
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
            placeholder="Repite tu contraseña"
            invalid={!!fieldErrors.confirmPassword}
            className="pl-11 pr-11"
          />
        </Field>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm h-12 rounded-2xl hover:bg-navy-700 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creando cuenta…
            </>
          ) : (
            'Crear mi cuenta'
          )}
        </button>

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Al registrarte aceptas nuestros{' '}
          <Link href="#" className="text-navy font-medium hover:underline">términos</Link>{' '}
          y la{' '}
          <Link href="#" className="text-navy font-medium hover:underline">política de privacidad</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
