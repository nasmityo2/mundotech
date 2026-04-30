'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { X, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { ADMIN_NAV_GROUPS, isItemActive } from '@/lib/admin-nav';

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

export default function SidebarDrawer({ open, onClose, userName, userEmail }: SidebarDrawerProps) {
  const pathname = usePathname();

  // Cerrar el drawer cuando cambia la ruta
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Cerrar con tecla ESC
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[320px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!open}
        role="dialog"
        aria-label="Menú de administración"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-navy tracking-tight">MundoTech</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Administración</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <X size={22} className="text-gray-600" />
          </button>
        </div>

        {(userName || userEmail) && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-navy truncate">{userName ?? 'Admin'}</p>
            {userEmail && <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {ADMIN_NAV_GROUPS.map(group => (
            <div key={group.id} className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const active = isItemActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-3 text-sm rounded-xl border-l-2 transition-colors min-h-[48px] ${
                          active
                            ? 'bg-amber-50 text-navy font-semibold border-brand-yellow'
                            : 'text-gray-700 border-transparent active:bg-gray-100'
                        }`}
                      >
                        <item.icon size={20} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge === 'new' && (
                          <span className="text-[9px] font-black uppercase bg-brand-yellow text-navy px-1.5 py-0.5 rounded">
                            new
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3 space-y-2">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-gray-600 rounded-xl active:bg-gray-100 min-h-[48px]"
          >
            ← Ir a la tienda
          </Link>
          <button
            type="button"
            onClick={() => { onClose(); signOut({ callbackUrl: '/login' }); }}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-600 rounded-xl active:bg-red-50 min-h-[48px]"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
