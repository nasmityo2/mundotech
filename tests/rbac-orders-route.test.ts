import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/admin-access-server', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

const order = {
  id: 'o1',
  customerId: 'client-1',
  items: [],
  orderNumber: 1,
  status: 'Pendiente',
  createdAt: new Date('2026-01-01'),
  customerName: 'Cliente',
  customerEmail: 'c@test.com',
  customerPhone: '0412',
  total: 10,
  subtotal: 10,
  shippingCost: 0,
  paymentMethod: 'Pago Móvil',
  shippingMethod: 'MRW',
};

describe('GET /api/orders/[id] RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cliente dueño → 200', async () => {
    const { getServerSession } = await import('next-auth/next');
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'client-1' } } as never);
    vi.mocked(prisma.order.findUnique)
      .mockResolvedValueOnce({ id: 'o1', customerId: 'client-1' } as never)
      .mockResolvedValueOnce(order as never);

    const { GET } = await import('@/app/api/orders/[id]/route');
    const res = await GET(new Request('http://localhost/api/orders/o1'), { params: Promise.resolve({ id: 'o1' }) });
    expect(res.status).toBe(200);
  });

  it('cliente ajeno → 403', async () => {
    const { getServerSession } = await import('next-auth/next');
    const { requirePermission } = await import('@/lib/admin-access-server');
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'client-2' } } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: 'o1', customerId: 'client-1' } as never);
    vi.mocked(requirePermission).mockResolvedValue({
      authorized: false,
      response: Response.json({ message: 'No autorizado.' }, { status: 403 }) as never,
    });

    const { GET } = await import('@/app/api/orders/[id]/route');
    const res = await GET(new Request('http://localhost/api/orders/o1'), { params: Promise.resolve({ id: 'o1' }) });
    expect(res.status).toBe(403);
  });

  it('ORDERS → 200', async () => {
    const { getServerSession } = await import('next-auth/next');
    const { requirePermission } = await import('@/lib/admin-access-server');
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'admin-1' } } as never);
    vi.mocked(prisma.order.findUnique)
      .mockResolvedValueOnce({ id: 'o1', customerId: 'client-1' } as never)
      .mockResolvedValueOnce(order as never);
    vi.mocked(requirePermission).mockResolvedValue({
      authorized: true,
      session: {} as never,
      access: { userId: 'admin-1', role: 'ADMIN', isSuperAdmin: false, permissions: ['ORDERS'] },
    });

    const { GET } = await import('@/app/api/orders/[id]/route');
    const res = await GET(new Request('http://localhost/api/orders/o1'), { params: Promise.resolve({ id: 'o1' }) });
    expect(res.status).toBe(200);
  });
});
