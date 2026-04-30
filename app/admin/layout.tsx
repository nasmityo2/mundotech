import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AdminShell from '@/components/admin/AdminShell';
import { isAdminRole } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MundoTech Admin',
  robots: { index: false, follow: false },
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
