'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ADMIN_CHUNK_RELOAD_KEY, clearChunkReloadFlag } from '@/lib/chunk-load-error';
import SidebarDesktop from './SidebarDesktop';
import SidebarDrawer from './SidebarDrawer';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';
import NewOrdersWatcher from './NewOrdersWatcher';

interface AdminShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

export default function AdminShell({ children, userName, userEmail }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // El layout sigue montado aunque error.tsx reemplace children; solo limpiar
    // la clave cuando la ruta cargó sin el boundary de error visible.
    const id = requestAnimationFrame(() => {
      if (!document.querySelector('[data-admin-error]')) {
        clearChunkReloadFlag(ADMIN_CHUNK_RELOAD_KEY);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] bg-white">
      <div className="contents print:hidden">
        <SidebarDesktop />
      </div>

      <div className="contents print:hidden">
        <SidebarDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          userName={userName}
          userEmail={userEmail}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="contents print:hidden">
          <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} />
        </div>

        <main
          className="flex-1 w-full min-w-0 px-3 sm:px-5 lg:px-8 py-4 sm:py-6 pb-[max(6rem,calc(4.25rem+env(safe-area-inset-bottom,0px)))] md:pb-10"
        >
          {children}
        </main>

        <div className="contents print:hidden">
          <MobileBottomNav />
        </div>
        <div className="contents print:hidden">
          <NewOrdersWatcher />
        </div>
      </div>
    </div>
  );
}
