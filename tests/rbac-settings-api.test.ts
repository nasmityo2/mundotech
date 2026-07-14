import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/data-store', () => ({
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
  storeSettingsSchema: { safeParse: vi.fn() },
}));

vi.mock('@/lib/admin-access-server', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/site-shell-cache', () => ({
  CACHE_TAG_SITE_SHELL: 'site-shell',
  CACHE_TAG_SETTINGS: 'settings',
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const mockSettings = {
  storeName: 'MundoTech',
  tagline: 'Tag',
  phone: '0412',
  phone2: '',
  email: 'a@b.com',
  address: 'Barq',
  instagram: '',
  facebook: '',
  labelWidthMm: 100,
  labelHeightMm: 150,
  whatsappOrderPhone: '',
  pagoMovil: { bank: 'Banesco', phone: '0412', idNumber: 'V1' },
  transferencia: { bank: 'Mercantil', accountNumber: '123', accountHolder: 'MT', rif: 'J1' },
  binancePayId: '123',
  binanceQrUrl: '',
};

describe('RBAC settings API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { readSettings } = await import('@/lib/data-store');
    vi.mocked(readSettings).mockResolvedValue(mockSettings as never);
  });

  it('GET STORE_SETTINGS no contiene cuentas financieras', async () => {
    const { requirePermission } = await import('@/lib/admin-access-server');
    vi.mocked(requirePermission).mockImplementation(async (perm) => {
      if (perm === 'STORE_SETTINGS') {
        return { authorized: true, session: {} as never, access: { userId: '1', role: 'ADMIN', isSuperAdmin: false, permissions: ['STORE_SETTINGS'] } };
      }
      return { authorized: false, response: new Response(null, { status: 403 }) as never };
    });

    const { GET } = await import('@/app/api/settings/route');
    const res = await GET(new Request('http://localhost/api/settings'));
    const body = await res.json();

    expect(body.storeName).toBe('MundoTech');
    expect(body.pagoMovil).toBeUndefined();
    expect(body.transferencia).toBeUndefined();
    expect(body.binancePayId).toBeUndefined();
  });

  it('PUT /api/settings/general rechaza campos financieros extra', async () => {
    const { requirePermission } = await import('@/lib/admin-access-server');
    vi.mocked(requirePermission).mockResolvedValue({
      authorized: true,
      session: {} as never,
      access: { userId: '1', role: 'ADMIN', isSuperAdmin: false, permissions: ['STORE_SETTINGS'] },
    });

    const { PUT } = await import('@/app/api/settings/general/route');
    const res = await PUT(new Request('http://localhost/api/settings/general', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: 'MT',
        phone: '0412',
        email: 'a@b.com',
        pagoMovil: { bank: 'x', phone: 'x', idNumber: 'x' },
      }),
    }));

    expect(res.status).toBe(400);
  });

  it('PUT /api/settings/financial exige FINANCIAL_SETTINGS', async () => {
    const { requirePermission } = await import('@/lib/admin-access-server');
    vi.mocked(requirePermission).mockResolvedValue({
      authorized: false,
      response: Response.json({ error: 'Acceso denegado.' }, { status: 403 }) as never,
    });

    const { PUT } = await import('@/app/api/settings/financial/route');
    const res = await PUT(new Request('http://localhost/api/settings/financial', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pagoMovil: { bank: '', phone: '', idNumber: '' },
        transferencia: { bank: '', accountNumber: '', accountHolder: '', rif: '' },
        binancePayId: '',
        binanceQrUrl: '',
      }),
    }));

    expect(res.status).toBe(403);
  });
});

describe('settingsActions legacy', () => {
  it('updateSettings no existe', async () => {
    const mod = await import('@/app/actions/settingsActions');
    expect(mod).not.toHaveProperty('updateSettings');
  });
});
