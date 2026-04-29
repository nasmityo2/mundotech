'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import {
  X, Mail, Lock, Eye, EyeOff, User,
  AlertCircle, CheckCircle2, Loader2, ShoppingBag,
} from 'lucide-react';

import { registerUserAction } from '@/app/actions/authActions';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email:    z.string().min(1, 'Requerido.').email('Correo inválido.'),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
});

const registerSchema = z.object({
  name:            z.string().min(2, 'Mínimo 2 caracteres.'),
  email:           z.string().email('Correo inválido.'),
  password:        z.string().min(8, 'Mínimo 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginRequiredModal({ onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login state
  const [lEmail, setLEmail]       = useState('');
  const [lPassword, setLPassword] = useState('');
  const [lShowPwd, setLShowPwd]   = useState(false);
  const [lErrors, setLErrors]     = useState<Record<string, string>>({});
  const [lServerErr, setLServerErr] = useState<string | null>(null);
  const [lLoading, setLLoading]   = useState(false);

  // Register state
  const [rName, setRName]                 = useState('');
  const [rEmail, setREmail]               = useState('');
  const [rPassword, setRPassword]         = useState('');
  const [rConfirm, setRConfirm]           = useState('');
  const [rShowPwd, setRShowPwd]           = useState(false);
  const [rShowConfirm, setRShowConfirm]   = useState(false);
  const [rErrors, setRErrors]             = useState<Record<string, string>>({});
  const [rServerErr, setRServerErr]       = useState<string | null>(null);
  const [rLoading, setRLoading]           = useState(false);
  const [rSuccess, setRSuccess]           = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLServerErr(null);
    setLErrors({});
    const parsed = loginSchema.safeParse({ email: lEmail, password: lPassword });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (!errs[k]) errs[k] = issue.message;
      }
      setLErrors(errs);
      return;
    }
    setLLoading(true);
    const result = await signIn('credentials', { redirect: false, email: parsed.data.email, password: parsed.data.password });
    setLLoading(false);
    if (result?.error) setLServerErr('Credenciales inválidas.');
    else onSuccess();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRServerErr(null);
    setRErrors({});
    const parsed = registerSchema.safeParse({ name: rName, email: rEmail, password: rPassword, confirmPassword: rConfirm });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (!errs[k]) errs[k] = issue.message;
      }
      setRErrors(errs);
      return;
    }
    setRLoading(true);
    const res = await registerUserAction({ name: parsed.data.name, email: parsed.data.email, password: parsed.data.password });
    if (!res.success) {
      setRLoading(false);
      setRServerErr(res.message || 'Error al registrar.');
      return;
    }
    const signInResult = await signIn('credentials', { redirect: false, email: parsed.data.email, password: parsed.data.password });
    setRLoading(false);
    if (signInResult?.error) {
      setRSuccess(true);
      setTimeout(() => { setTab('login'); setLEmail(parsed.data.email); setRSuccess(false); }, 1500);
    } else {
      onSuccess();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="login-required-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 backdrop-blur-sm px-4 py-4 sm:py-8"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-white w-full max-w-md rounded-3xl shadow-lift flex flex-col max-h-[92dvh] overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-start justify-between flex-shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-navy text-brand-yellow flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={17} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-base font-semibold text-navy tracking-tight">Accede para continuar</h2>
                <p className="text-[11px] sm:text-[12px] text-slate-500 mt-0.5">Inicia sesión o crea una cuenta en segundos.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] -mr-2 rounded-xl flex items-center justify-center text-slate-500 hover:text-navy hover:bg-slate-100 active:bg-slate-200 transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 px-3 pt-3 gap-2 flex-shrink-0">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`min-h-[44px] rounded-xl text-sm font-semibold transition-colors ${
                  tab === t ? 'bg-navy text-white shadow-soft' : 'text-slate-500 hover:bg-slate-100 active:bg-slate-200'
                }`}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 sm:px-6 py-5 flex-1">
            {tab === 'login' && (
              <form onSubmit={handleLogin} noValidate className="space-y-4">
                {lServerErr && (
                  <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2.5 rounded-xl text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {lServerErr}
                  </div>
                )}

                <Field id="l-email" label="Correo electrónico" leading={<Mail size={15} />} error={lErrors.email}>
                  <Input
                    id="l-email" type="email" autoComplete="email"
                    value={lEmail}
                    onChange={(e) => { setLEmail(e.target.value); setLErrors((p) => ({ ...p, email: '' })); }}
                    placeholder="tu@email.com" invalid={!!lErrors.email}
                    className="pl-11"
                  />
                </Field>

                <Field
                  id="l-password" label="Contraseña" leading={<Lock size={15} />}
                  error={lErrors.password}
                  trailing={
                    <button type="button" onClick={() => setLShowPwd((v) => !v)} className="hover:text-navy transition-colors p-1">
                      {lShowPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                >
                  <Input
                    id="l-password" type={lShowPwd ? 'text' : 'password'} autoComplete="current-password"
                    value={lPassword}
                    onChange={(e) => { setLPassword(e.target.value); setLErrors((p) => ({ ...p, password: '' })); }}
                    placeholder="Mínimo 8 caracteres" invalid={!!lErrors.password}
                    className="pl-11 pr-11"
                  />
                </Field>

                <button
                  type="submit" disabled={lLoading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm min-h-[48px] rounded-2xl hover:bg-navy-700 active:bg-navy-800 shadow-soft hover:shadow-card transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {lLoading ? <><Loader2 size={15} className="animate-spin" /> Ingresando…</> : 'Ingresar'}
                </button>
              </form>
            )}

            {tab === 'register' && (
              <form onSubmit={handleRegister} noValidate className="space-y-4">
                {rSuccess && (
                  <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2.5 rounded-xl text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Cuenta creada. Iniciando sesión…
                  </div>
                )}
                {rServerErr && (
                  <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2.5 rounded-xl text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {rServerErr}
                  </div>
                )}

                <Field id="r-name" label="Nombre" leading={<User size={15} />} error={rErrors.name}>
                  <Input
                    id="r-name" type="text" autoComplete="name"
                    value={rName}
                    onChange={(e) => { setRName(e.target.value); setRErrors((p) => ({ ...p, name: '' })); }}
                    placeholder="Tu nombre completo" invalid={!!rErrors.name}
                    className="pl-11"
                  />
                </Field>

                <Field id="r-email" label="Correo" leading={<Mail size={15} />} error={rErrors.email}>
                  <Input
                    id="r-email" type="email" autoComplete="email"
                    value={rEmail}
                    onChange={(e) => { setREmail(e.target.value); setRErrors((p) => ({ ...p, email: '' })); }}
                    placeholder="tu@email.com" invalid={!!rErrors.email}
                    className="pl-11"
                  />
                </Field>

                <Field
                  id="r-password" label="Contraseña" leading={<Lock size={15} />}
                  error={rErrors.password}
                  trailing={
                    <button type="button" onClick={() => setRShowPwd((v) => !v)} className="hover:text-navy transition-colors p-1">
                      {rShowPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                >
                  <Input
                    id="r-password" type={rShowPwd ? 'text' : 'password'} autoComplete="new-password"
                    value={rPassword}
                    onChange={(e) => { setRPassword(e.target.value); setRErrors((p) => ({ ...p, password: '' })); }}
                    placeholder="Mínimo 8 caracteres" invalid={!!rErrors.password}
                    className="pl-11 pr-11"
                  />
                </Field>

                <Field
                  id="r-confirm" label="Confirmar contraseña" leading={<Lock size={15} />}
                  error={rErrors.confirmPassword}
                  trailing={
                    <button type="button" onClick={() => setRShowConfirm((v) => !v)} className="hover:text-navy transition-colors p-1">
                      {rShowConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                >
                  <Input
                    id="r-confirm" type={rShowConfirm ? 'text' : 'password'} autoComplete="new-password"
                    value={rConfirm}
                    onChange={(e) => { setRConfirm(e.target.value); setRErrors((p) => ({ ...p, confirmPassword: '' })); }}
                    placeholder="Repite tu contraseña" invalid={!!rErrors.confirmPassword}
                    className="pl-11 pr-11"
                  />
                </Field>

                <button
                  type="submit" disabled={rLoading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm min-h-[48px] rounded-2xl hover:bg-navy-700 active:bg-navy-800 shadow-soft hover:shadow-card transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {rLoading ? <><Loader2 size={15} className="animate-spin" /> Creando cuenta…</> : 'Crear cuenta'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
