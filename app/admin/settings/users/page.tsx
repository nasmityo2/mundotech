import { listAdminUsers, listPermissionAuditLog } from '@/app/actions/userActions';
import { requireAdminPageSuperAdmin } from '@/lib/admin-access-server';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const access = await requireAdminPageSuperAdmin();
  const [users, auditLog] = await Promise.all([
    listAdminUsers(),
    listPermissionAuditLog(),
  ]);
  return (
    <UsersClient
      users={users}
      auditLog={auditLog}
      currentUserId={access.userId}
    />
  );
}
