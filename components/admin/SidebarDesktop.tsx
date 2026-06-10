'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_GROUPS, isItemActive } from '@/lib/admin-nav';

export default function SidebarDesktop() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0 sticky top-0 h-screen">
      <div className="p-5 border-b border-gray-100 flex-shrink-0 bg-navy">
        <Link href="/admin" className="block">
          <h1 className="text-xl font-black tracking-tight text-white">
            Mundo<span className="text-brand-yellow">Tech</span>
          </h1>
          <p className="text-[10px] text-brand-yellow/90 mt-0.5 uppercase tracking-[0.2em] font-bold">
            Conectados Contigo
          </p>
        </Link>
      </div>

      <nav className="flex-grow overflow-y-auto px-3 py-3 space-y-4">
        {ADMIN_NAV_GROUPS.map(group => (
          <div key={group.id}>
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
                      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg border-l-2 transition-colors ${
                        active
                          ? 'bg-amber-50 text-navy font-semibold border-brand-yellow'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-navy border-transparent'
                      }`}
                    >
                      <item.icon size={17} className="flex-shrink-0" />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge === 'new' && (
                        <span className="text-[9px] font-black uppercase bg-brand-yellow text-navy px-1.5 py-0.5 rounded">
                          nuevo
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

      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1.5"
        >
          ← Volver a la tienda
        </Link>
        <p className="px-2 pt-1 text-[10px] leading-relaxed text-gray-300">
          C.C. Minicentro 34 · Barquisimeto
        </p>
      </div>
    </aside>
  );
}
