'use client';

import { useState, useTransition } from 'react';
import {
  Users, Plus, ShieldCheck, ShieldOff, KeyRound,
  Trash2, Loader2, X, Check, AlertCircle, UserCircle,
} from 'lucide-react';
import {
  type AdminUser, createAdminUser, updateUserRole,
  resetUserPassword, deleteAdminUser,
} from '@/app/actions/userActions';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { TouchIconButton } from '@/components/admin/TouchIconButton';
import { isAdminRole } from '@/lib/is-admin-role';

interface UsersClientProps {
  users: AdminUser[];
  currentUserId: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' });

export default function UsersClient({ users: initial, currentUserId }: UsersClientProps) {
  const [users, setUsers]               = useState(initial);
  const [createOpen, setCreateOpen]     = useState(false);
  const [resetUser, setResetUser]       = useState<AdminUser | null>(null);
  const [feedback, setFeedback]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const flash = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const refresh = async () => {
    // Recarga local: pedimos al action y reseteamos
    const { listAdminUsers } = await import('@/app/actions/userActions');
    setUsers(await listAdminUsers());
  };

  const handleToggleRole = async (u: AdminUser) => {
    const newRole = isAdminRole(u.role) ? 'CLIENT' : 'ADMIN';
    const res = await updateUserRole(u.id, newRole);
    if (res.success) {
      flash('success', res.message);
      await refresh();
    } else flash('error', res.message);
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`¿Eliminar el usuario "${u.email}"?`)) return;
    const res = await deleteAdminUser(u.id);
    if (res.success) {
      flash('success', res.message);
      await refresh();
    } else flash('error', res.message);
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'name', header: 'Usuario', primary: true,
      cell: u => (
        <span className="block truncate">
          {u.name || <span className="text-gray-400 italic">Sin nombre</span>}
          {u.id === currentUserId && (
            <span className="ml-1.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">tú</span>
          )}
        </span>
      ),
    },
    {
      key: 'email', header: 'Email', secondary: true, mobileLabel: 'Email',
      cell: u => <span className="text-gray-500 truncate text-sm">{u.email}</span>,
    },
    {
      key: 'role', header: 'Rol', mobileLabel: 'Rol',
      cell: u => (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
          isAdminRole(u.role)
            ? 'bg-amber-100 text-amber-800 border border-amber-200'
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}>
          {u.role}
        </span>
      ),
    },
    {
      key: 'orders', header: 'Pedidos', mobileLabel: 'Pedidos', align: 'right',
      cell: u => <span className="text-sm font-mono text-gray-600">{u.orderCount}</span>,
    },
    {
      key: 'createdAt', header: 'Alta', mobileLabel: 'Alta', hideOnMobile: true,
      cell: u => <span className="text-xs text-gray-500">{formatDate(u.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-amber-50 text-navy flex items-center justify-center">
            <Users size={22} />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-navy">Usuarios</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gestiona accesos al panel y a la cuenta de cliente.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-4 bg-brand-yellow border border-yellow-400 text-navy text-sm font-black uppercase tracking-wide rounded-xl active:bg-yellow-300"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {feedback && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? <Check size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <DataTable<AdminUser>
        data={users}
        columns={columns}
        rowKey={u => u.id}
        mobileLeading={u => (
          <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
            isAdminRole(u.role) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <UserCircle size={22} />
          </span>
        )}
        actions={u => (
          <>
            <TouchIconButton
              label={isAdminRole(u.role) ? 'Hacer cliente' : 'Promover a admin'}
              variant="primary"
              icon={isAdminRole(u.role) ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
              onClick={() => handleToggleRole(u)}
            />
            <TouchIconButton
              label="Resetear contraseña"
              icon={<KeyRound size={18} />}
              onClick={() => setResetUser(u)}
            />
            <TouchIconButton
              label="Eliminar"
              variant="danger"
              icon={<Trash2 size={18} />}
              onClick={() => handleDelete(u)}
              disabled={u.id === currentUserId}
            />
          </>
        )}
      />

      {createOpen && <CreateUserDialog onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refresh(); flash('success', 'Usuario creado.'); }} />}
      {resetUser && <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} onDone={() => { setResetUser(null); flash('success', 'Contraseña actualizada.'); }} />}
    </div>
  );
}

// ─── Diálogos ───────────────────────────────────────────────────────────────

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'ADMIN' | 'CLIENT'>('CLIENT');
  const [pending, startTransition] = useTransition();
  const [error, setError]       = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createAdminUser({ name, email, password, role });
      if (res.success) onCreated();
      else setError(res.message);
    });
  };

  return (
    <Dialog title="Nuevo usuario" onClose={onClose}>
      <DialogField label="Nombre completo" value={name} onChange={setName} />
      <DialogField label="Email" type="email" value={email} onChange={setEmail} />
      <DialogField label="Contraseña" type="password" value={password} onChange={setPassword} hint="Mínimo 8 caracteres." />
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1.5">Rol</label>
        <div className="grid grid-cols-2 gap-2">
          {(['CLIENT', 'ADMIN'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`min-h-[48px] rounded-xl text-sm font-bold border ${
                role === r
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-gray-600 border-gray-200 active:bg-gray-100'
              }`}
            >
              {r === 'ADMIN' ? '🛡 Administrador' : '👤 Cliente'}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}
      <DialogFooter>
        <button onClick={onClose} disabled={pending} className="flex-1 min-h-[48px] bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl">Cancelar</button>
        <button onClick={submit} disabled={pending} className="flex-1 min-h-[48px] bg-brand-yellow border border-yellow-400 text-navy text-sm font-black uppercase rounded-xl flex items-center justify-center gap-2">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError]       = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await resetUserPassword({ userId: user.id, password });
      if (res.success) onDone();
      else setError(res.message);
    });
  };

  return (
    <Dialog title={`Nueva contraseña — ${user.email}`} onClose={onClose}>
      <DialogField label="Nueva contraseña" type="password" value={password} onChange={setPassword} hint="Mínimo 8 caracteres." />
      {error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}
      <DialogFooter>
        <button onClick={onClose} disabled={pending} className="flex-1 min-h-[48px] bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl">Cancelar</button>
        <button onClick={submit} disabled={pending} className="flex-1 min-h-[48px] bg-brand-yellow border border-yellow-400 text-navy text-sm font-black uppercase rounded-xl flex items-center justify-center gap-2">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Cambiar
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full sm:w-[420px] sm:max-w-[92vw] sm:my-6 bg-white sm:rounded-2xl shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[88vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header className="sticky top-0 bg-white sm:rounded-t-2xl border-b border-gray-100 px-4 py-3.5 flex items-center justify-between gap-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.875rem)' }}>
          <h2 className="text-base font-black text-navy truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 pt-2">{children}</div>;
}

function DialogField({ label, value, onChange, type = 'text', hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full min-h-[48px] px-3.5 py-2 border border-gray-200 rounded-xl bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
      />
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
