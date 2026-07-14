import { describe, it, expect } from 'vitest';
import {
  filterBottomNav,
  filterNavGroups,
  ADMIN_BOTTOM_NAV,
  ADMIN_NAV_GROUPS,
} from '@/lib/admin-nav';

import type { CurrentAdminAccess } from '@/lib/admin-access-server';

const ordersOnly: CurrentAdminAccess = {
  userId: 'u1',
  role: 'ADMIN',
  isSuperAdmin: false,
  permissions: ['ORDERS'],
};

const storeOnly: CurrentAdminAccess = {
  userId: 'u2',
  role: 'ADMIN',
  isSuperAdmin: false,
  permissions: ['STORE_SETTINGS'],
};

describe('RBAC navigation filtering', () => {
  it('solo muestra elementos permitidos', () => {
    const groups = filterNavGroups(ADMIN_NAV_GROUPS, ordersOnly);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toContain('Pedidos');
    expect(labels).not.toContain('Productos');
    expect(labels).not.toContain('Usuarios');
  });

  it('Settings visible con STORE_SETTINGS o FINANCIAL_SETTINGS', () => {
    const storeGroups = filterNavGroups(ADMIN_NAV_GROUPS, storeOnly);
    const financialGroups = filterNavGroups(ADMIN_NAV_GROUPS, {
      ...storeOnly,
      permissions: ['FINANCIAL_SETTINGS'],
    });
    expect(storeGroups.flatMap(g => g.items).some(i => i.href === '/admin/settings')).toBe(true);
    expect(financialGroups.flatMap(g => g.items).some(i => i.href === '/admin/settings')).toBe(true);
  });

  it('Usuarios solo Superadmin', () => {
    const groups = filterNavGroups(ADMIN_NAV_GROUPS, ordersOnly);
    expect(groups.flatMap(g => g.items).some(i => i.href === '/admin/settings/users')).toBe(false);
    const superGroups = filterNavGroups(ADMIN_NAV_GROUPS, {
      ...ordersOnly,
      isSuperAdmin: true,
      permissions: [],
    });
    expect(superGroups.flatMap(g => g.items).some(i => i.href === '/admin/settings/users')).toBe(true);
  });

  it('bottom nav coherente con permisos', () => {
    const items = filterBottomNav(ADMIN_BOTTOM_NAV, ordersOnly);
    expect(items.map(i => i.href)).toEqual(['/admin/orders', '/admin/menu']);
  });
});
