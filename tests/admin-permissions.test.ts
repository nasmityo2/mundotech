import { describe, expect, it } from 'vitest';
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_META,
  isAdminPermission,
  normalizeAdminPermissions,
  hasAdminPermission,
  getPermissionsByGroup,
  type AdminPermission,
} from '@/lib/admin-permissions';

// ─────────────────────────────────────────────────────────────────────────────
// ALLOWLIST
// ─────────────────────────────────────────────────────────────────────────────

describe('ADMIN_PERMISSIONS — allowlist canónica', () => {
  it('contiene exactamente 12 permisos', () => {
    expect(ADMIN_PERMISSIONS).toHaveLength(12);
  });

  it('contiene todos los permisos documentados', () => {
    const expected: AdminPermission[] = [
      'DASHBOARD',
      'ANALYTICS',
      'ORDERS',
      'PAYMENTS',
      'CATALOG',
      'REVIEWS',
      'PROMOTIONS',
      'SITE_CONTENT',
      'STORE_SETTINGS',
      'FINANCIAL_SETTINGS',
      'OPERATIONS',
      'CUSTOMER_DATA_EXPORT',
    ];
    expect([...ADMIN_PERMISSIONS]).toEqual(expected);
  });

  it('no contiene duplicados', () => {
    const set = new Set(ADMIN_PERMISSIONS);
    expect(set.size).toBe(ADMIN_PERMISSIONS.length);
  });

  it('cada permiso tiene metadatos completos (label, description, group)', () => {
    for (const perm of ADMIN_PERMISSIONS) {
      const meta = ADMIN_PERMISSION_META[perm];
      expect(meta, `falta meta para ${perm}`).toBeDefined();
      expect(meta.label.length, `label vacío en ${perm}`).toBeGreaterThan(0);
      expect(meta.description.length, `description vacío en ${perm}`).toBeGreaterThan(0);
      expect(meta.group.length, `group vacío en ${perm}`).toBeGreaterThan(0);
    }
  });

  it('los grupos son exactamente los esperados', () => {
    const groups = new Set(ADMIN_PERMISSIONS.map((p) => ADMIN_PERMISSION_META[p].group));
    expect([...groups].sort()).toEqual(
      ['Catálogo', 'Configuración', 'General', 'Marketing', 'Seguridad y datos', 'Ventas'].sort(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isAdminPermission
// ─────────────────────────────────────────────────────────────────────────────

describe('isAdminPermission — type guard', () => {
  it('retorna true para cada permiso válido', () => {
    for (const perm of ADMIN_PERMISSIONS) {
      expect(isAdminPermission(perm)).toBe(true);
    }
  });

  it('retorna false para strings desconocidos', () => {
    expect(isAdminPermission('USERS')).toBe(false);
    expect(isAdminPermission('ADMIN')).toBe(false);
    expect(isAdminPermission('ALL')).toBe(false);
    expect(isAdminPermission('*')).toBe(false);
    expect(isAdminPermission('')).toBe(false);
  });

  it('retorna false para wildcards y prefijos', () => {
    expect(isAdminPermission('*')).toBe(false);
    expect(isAdminPermission('ALL')).toBe(false);
    expect(isAdminPermission('DASH')).toBe(false);
    expect(isAdminPermission('dashboard')).toBe(false);
  });

  it('retorna false para valores no-string', () => {
    expect(isAdminPermission(null)).toBe(false);
    expect(isAdminPermission(undefined)).toBe(false);
    expect(isAdminPermission(42)).toBe(false);
    expect(isAdminPermission(true)).toBe(false);
    expect(isAdminPermission({})).toBe(false);
    expect(isAdminPermission(['DASHBOARD'])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizeAdminPermissions
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeAdminPermissions — normalización', () => {
  it('filtra valores desconocidos', () => {
    expect(normalizeAdminPermissions(['DASHBOARD', 'UNKNOWN', 'ALL'])).toEqual(
      ['DASHBOARD'],
    );
  });

  it('elimina duplicados', () => {
    const result = normalizeAdminPermissions(['ORDERS', 'ORDERS', 'CATALOG', 'ORDERS']);
    expect(result).toEqual(['ORDERS', 'CATALOG']);
  });

  it('mantiene el orden canónico de ADMIN_PERMISSIONS', () => {
    const input = ['FINANCIAL_SETTINGS', 'DASHBOARD', 'ORDERS'];
    const result = normalizeAdminPermissions(input);
    // El orden correcto según ADMIN_PERMISSIONS es: DASHBOARD, ORDERS, FINANCIAL_SETTINGS
    expect(result).toEqual(['DASHBOARD', 'ORDERS', 'FINANCIAL_SETTINGS']);
  });

  it('retorna array vacío para input vacío', () => {
    expect(normalizeAdminPermissions([])).toEqual([]);
  });

  it('retorna array vacío para input no-array', () => {
    expect(normalizeAdminPermissions(null)).toEqual([]);
    expect(normalizeAdminPermissions(undefined)).toEqual([]);
    expect(normalizeAdminPermissions('DASHBOARD')).toEqual([]);
    expect(normalizeAdminPermissions(42)).toEqual([]);
  });

  it('no acepta wildcards como permiso válido', () => {
    expect(normalizeAdminPermissions(['*', 'ALL', 'ADMIN'])).toEqual([]);
  });

  it('normaliza todos los permisos válidos si se pasan todos', () => {
    const shuffled = [...ADMIN_PERMISSIONS].reverse();
    const result = normalizeAdminPermissions(shuffled);
    expect(result).toEqual([...ADMIN_PERMISSIONS]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasAdminPermission
// ─────────────────────────────────────────────────────────────────────────────

describe('hasAdminPermission — verificación de acceso', () => {
  it('permiso presente en array → true para usuario normal', () => {
    expect(
      hasAdminPermission(
        { isSuperAdmin: false, permissions: ['ORDERS', 'CATALOG'] },
        'ORDERS',
      ),
    ).toBe(true);
  });

  it('permiso ausente en array → false para usuario normal', () => {
    expect(
      hasAdminPermission(
        { isSuperAdmin: false, permissions: ['ORDERS'] },
        'PAYMENTS',
      ),
    ).toBe(false);
  });

  it('array vacío → false para cada permiso en usuario normal', () => {
    for (const perm of ADMIN_PERMISSIONS) {
      expect(
        hasAdminPermission({ isSuperAdmin: false, permissions: [] }, perm),
      ).toBe(false);
    }
  });

  it('Superadmin → true para TODOS los permisos aunque array esté vacío', () => {
    for (const perm of ADMIN_PERMISSIONS) {
      expect(
        hasAdminPermission({ isSuperAdmin: true, permissions: [] }, perm),
      ).toBe(true);
    }
  });

  it('Superadmin → true aunque el permiso no esté en el array', () => {
    expect(
      hasAdminPermission(
        { isSuperAdmin: true, permissions: ['DASHBOARD'] },
        'FINANCIAL_SETTINGS',
      ),
    ).toBe(true);
  });

  it('permiso desconocido → false incluso con Superadmin', () => {
    expect(
      hasAdminPermission(
        { isSuperAdmin: true, permissions: [] },
        'UNKNOWN' as AdminPermission,
      ),
    ).toBe(false);
  });

  it('ORDERS sin PAYMENTS → false para PAYMENTS', () => {
    expect(
      hasAdminPermission(
        { isSuperAdmin: false, permissions: ['ORDERS'] },
        'PAYMENTS',
      ),
    ).toBe(false);
  });

  it('STORE_SETTINGS no otorga FINANCIAL_SETTINGS', () => {
    expect(
      hasAdminPermission(
        { isSuperAdmin: false, permissions: ['STORE_SETTINGS'] },
        'FINANCIAL_SETTINGS',
      ),
    ).toBe(false);
  });

  it('ORDERS no otorga CUSTOMER_DATA_EXPORT', () => {
    expect(
      hasAdminPermission(
        { isSuperAdmin: false, permissions: ['ORDERS'] },
        'CUSTOMER_DATA_EXPORT',
      ),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPermissionsByGroup
// ─────────────────────────────────────────────────────────────────────────────

describe('getPermissionsByGroup — agrupación', () => {
  it('retorna todos los permisos agrupados', () => {
    const groups = getPermissionsByGroup();
    const allPerms = groups.flatMap((g) => g.permissions);
    expect(allPerms.sort()).toEqual([...ADMIN_PERMISSIONS].sort());
  });

  it('no hay duplicados entre grupos', () => {
    const groups = getPermissionsByGroup();
    const allPerms = groups.flatMap((g) => g.permissions);
    expect(allPerms).toHaveLength(new Set(allPerms).size);
  });

  it('DASHBOARD y ANALYTICS están en grupo "General"', () => {
    const groups = getPermissionsByGroup();
    const general = groups.find((g) => g.group === 'General');
    expect(general?.permissions).toContain('DASHBOARD');
    expect(general?.permissions).toContain('ANALYTICS');
  });

  it('ORDERS y PAYMENTS están en grupo "Ventas"', () => {
    const groups = getPermissionsByGroup();
    const ventas = groups.find((g) => g.group === 'Ventas');
    expect(ventas?.permissions).toContain('ORDERS');
    expect(ventas?.permissions).toContain('PAYMENTS');
  });
});
