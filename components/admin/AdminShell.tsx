'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { CurrentAdminAccess } from '@/lib/admin-access-server';
import { ADMIN_BOTTOM_NAV, ADMIN_NAV_GROUPS, filterBottomNav, filterNavGroups, type NavGroup } from '@/lib/admin-nav';
import { ADMIN_CHUNK_RELOAD_KEY, clearChunkReloadFlag } from '@/lib/chunk-load-error';
import SidebarDesktop from './SidebarDesktop';
import SidebarDrawer from './SidebarDrawer';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';
import NewOrdersWatcher from './NewOrdersWatcher';

interface AdminShellProps {
  children: React.ReactNode;
  access: CurrentAdminAccess;
  userName?: string;
  userEmail?: string;
}

export default function AdminShell({ children, access, userName, userEmail }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const filteredGroups = filterNavGroups(ADMIN_NAV_GROUPS, access);
  const filteredBottomNav = filterBottomNav(ADMIN_BOTTOM_NAV, access);

  useEffect(() => {
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
        <SidebarDesktop navGroups={filteredGroups} />
      </div>

      <div className="contents print:hidden">
        <SidebarDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          userName={userName}
          userEmail={userEmail}
          navGroups={filteredGroups}
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
          <MobileBottomNav items={filteredBottomNav} />
        </div>
        <div className="contents print:hidden">
          <NewOrdersWatcher />
        </div>
      </div>
    </div>
  );
}
