import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AdminShell from '@/components/admin/AdminShell';
import { isAdminRole } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MundoTech Admin',
  robots: { index: false, follow: false },
  manifest: '/admin-manifest.json',
  themeColor: '#0a0a23',
  appleWebApp: {
    title: 'MT Admin',
    statusBarStyle: 'black-translucent' as const,
    capable: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0a0a23',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || !isAdminRole(role)) {
    redirect('/login?callbackUrl=/admin');
  }

  return (
    <AdminShell
      userName={session.user?.name ?? undefined}
      userEmail={session.user?.email ?? undefined}
    >
      {children}
    </AdminShell>
  );
}
