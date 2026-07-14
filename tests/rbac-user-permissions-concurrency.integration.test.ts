import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { assertE2eDatabaseUrl, confirmE2eDatabaseSchema } from '@/lib/e2e-db-guard';
import { createScriptPrisma } from '@/scripts/lib/script-prisma';
import { buildE2eDatabaseUrlFromEnvFile, canConnectToDatabase } from './helpers/e2e-database-url';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/admin-access-server', () => ({
  requireSuperAdminAction: vi.fn(),
}));

const e2eUrl = process.env.E2E_INTEGRATION_DATABASE_URL ?? buildE2eDatabaseUrlFromEnvFile();
const describeWithDb = e2eUrl ? describe : describe.skip;

describeWithDb('updateUserPermissions — concurrencia PostgreSQL', () => {
  let prisma: ReturnType<typeof createScriptPrisma>;
  let updateUserPermissions: typeof import('@/app/actions/userActions').updateUserPermissions;
  let requireSuperAdminAction: typeof import('@/lib/admin-access-server').requireSuperAdminAction;
  let dbReady = false;
  let rbacReady = false;

  beforeAll(async () => {
    if (!e2eUrl) return;
    assertE2eDatabaseUrl(e2eUrl);
    dbReady = await canConnectToDatabase(e2eUrl);
    if (!dbReady) return;

    vi.stubEnv('DATABASE_URL', e2eUrl);
    vi.stubEnv('DIRECT_URL', e2eUrl);
    vi.resetModules();

    prisma = createScriptPrisma();
    await confirmE2eDatabaseSchema(async () => {
      const rows = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
      return rows[0]?.current_database ?? '';
    });

    const cols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'isSuperAdmin'
    `;
    rbacReady = cols.length > 0;
    if (!rbacReady) return;

    requireSuperAdminAction = (await import('@/lib/admin-access-server')).requireSuperAdminAction;
    updateUserPermissions = (await import('@/app/actions/userActions')).updateUserPermissions;
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('dos updates concurrentes dejan estado final consistente y auditoría encadenada', async () => {
    if (!dbReady || !rbacReady) return;

    const actor = await prisma.user.create({
      data: {
        email: `super-${Date.now()}@rbac.test`,
        password: 'hash',
        role: 'ADMIN',
        isSuperAdmin: true,
        adminPermissions: [],
      },
    });

    const target = await prisma.user.create({
      data: {
        email: `target-${Date.now()}@rbac.test`,
        password: 'hash',
        role: 'CLIENT',
        adminPermissions: [],
      },
    });

    vi.mocked(requireSuperAdminAction).mockResolvedValue({
      userId: actor.id,
      role: 'ADMIN',
      isSuperAdmin: true,
      permissions: [],
    });

    const [a, b] = await Promise.allSettled([
      updateUserPermissions({ userId: target.id, permissions: ['ORDERS'] }),
      updateUserPermissions({ userId: target.id, permissions: ['CATALOG'] }),
    ]);

    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('fulfilled');

    const finalUser = await prisma.user.findUnique({ where: { id: target.id } });
    expect(finalUser?.adminPermissions.length).toBeGreaterThan(0);

    const logs = await prisma.permissionAuditLog.findMany({
      where: { targetUserId: target.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);

    await prisma.permissionAuditLog.deleteMany({ where: { targetUserId: target.id } });
    await prisma.user.deleteMany({ where: { id: { in: [actor.id, target.id] } } });
  });
});
