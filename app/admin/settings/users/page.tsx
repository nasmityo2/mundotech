import { listAdminUsers } from '@/app/actions/userActions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([listAdminUsers(), getServerSession(authOptions)]);
  return <UsersClient users={users} currentUserId={session?.user?.id ?? ''} />;
}
