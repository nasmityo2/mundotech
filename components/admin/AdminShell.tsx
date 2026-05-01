'use client';

import { useState } from 'react';
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

  return (
    <div className="flex min-h-[100dvh] bg-[#F1F5F9]">
      <SidebarDesktop />

      <SidebarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
        userEmail={userEmail}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} />

        <main
          className="flex-1 w-full min-w-0 px-3 sm:px-5 lg:px-8 py-4 sm:py-6 pb-[max(6rem,calc(4.25rem+env(safe-area-inset-bottom,0px)))] md:pb-10"
        >
          {children}
        </main>

        <MobileBottomNav />
        <NewOrdersWatcher />
      </div>
    </div>
  );
}
