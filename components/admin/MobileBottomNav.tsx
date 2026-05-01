'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_BOTTOM_NAV, isItemActive } from '@/lib/admin-nav';

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {ADMIN_BOTTOM_NAV.map(item => {
          const active = isItemActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center h-16 gap-0.5 select-none touch-manipulation transition active:bg-gray-100 ${
                  active ? 'text-navy' : 'text-gray-400'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-yellow rounded-b-full" />
                )}
                <item.icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
