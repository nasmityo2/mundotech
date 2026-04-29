'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ShoppingBag, User, Lock, LogOut, Heart } from 'lucide-react';

const navItems = [
  { href: '/account/orders',   label: 'Mis pedidos',    icon: ShoppingBag },
  { href: '/account/details',  label: 'Mi perfil',      icon: User },
  { href: '/account/password', label: 'Contraseña',     icon: Lock },
  { href: '/wishlist',         label: 'Favoritos',      icon: Heart },
];

const AccountSidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initial = (session?.user?.name?.[0] ?? 'U').toUpperCase();

  return (
    <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
      <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-navy text-brand-yellow flex items-center justify-center text-lg font-bold flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy truncate">
            {session?.user?.name ?? 'Mi cuenta'}
          </p>
          <p className="text-[12px] text-slate-500 truncate">
            {session?.user?.email ?? ''}
          </p>
        </div>
      </div>

      <nav className="p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-3 px-3.5 h-11 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-slate-100 text-navy font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-brand-yellow" />}
              <item.icon size={16} className={isActive ? 'text-navy' : 'text-slate-400'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-slate-100">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-3.5 h-11 w-full rounded-xl text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default AccountSidebar;
