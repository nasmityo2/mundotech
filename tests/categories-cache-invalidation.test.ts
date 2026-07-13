/**
 * SESIÓN 15 — Invalidación de caché en mutaciones de categorías.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('@/lib/api-auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  rejectInvalidMutationOrigin: vi.fn(() => null),
}));

vi.mock('@/lib/slug-redirects', () => ({
  saveSlugRedirect: vi.fn(),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: (name: string) => name.toLowerCase().replace(/\s+/g, '-'),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

describe('invalidación categories + site-shell en mutaciones de categorías', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/categories revalida categories y site-shell tras éxito', async () => {
    const { requireAdmin } = await import('@/lib/api-auth');
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'a1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.category.create).mockResolvedValue({
      id: 'c1',
      name: 'Consolas',
      slug: 'consolas',
      imageUrl: null,
      isFeatured: false,
      order: 0,
      description: null,
      seoTitle: null,
      googleCategoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { POST } = await import('@/app/api/categories/route');
    const response = await POST(
      new Request('http://localhost/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
        body: JSON.stringify({ name: 'Consolas', slug: 'consolas' }),
      }),
    );

    expect(response.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith('categories', 'default');
    expect(revalidateTag).toHaveBeenCalledWith('site-shell', 'default');
  });

  it('PUT /api/categories/[id] revalida categories y site-shell tras éxito', async () => {
    const { requireAdmin } = await import('@/lib/api-auth');
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'a1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ slug: 'consolas' } as never);
    vi.mocked(prisma.category.update).mockResolvedValue({
      id: 'c1',
      name: 'Consolas',
      slug: 'consolas',
      imageUrl: null,
      isFeatured: true,
      order: 1,
      description: null,
      seoTitle: null,
      googleCategoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { PUT } = await import('@/app/api/categories/[id]/route');
    const response = await PUT(
      new Request('http://localhost/api/categories/c1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
        body: JSON.stringify({ name: 'Consolas', slug: 'consolas', isFeatured: true, order: 1 }),
      }),
      { params: Promise.resolve({ id: 'c1' }) },
    );

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('categories', 'default');
    expect(revalidateTag).toHaveBeenCalledWith('site-shell', 'default');
  });

  it('DELETE /api/categories/[id] revalida categories y site-shell tras éxito', async () => {
    const { requireAdmin } = await import('@/lib/api-auth');
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'a1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.category.delete).mockResolvedValue({
      id: 'c1',
      name: 'Consolas',
      slug: 'consolas',
      imageUrl: null,
      isFeatured: false,
      order: 0,
      description: null,
      seoTitle: null,
      googleCategoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { DELETE } = await import('@/app/api/categories/[id]/route');
    const response = await DELETE(
      new Request('http://localhost/api/categories/c1', {
        method: 'DELETE',
        headers: { Origin: 'http://localhost' },
      }),
      { params: Promise.resolve({ id: 'c1' }) },
    );

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('categories', 'default');
    expect(revalidateTag).toHaveBeenCalledWith('site-shell', 'default');
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('POST /api/categories/sync revalida categories y site-shell tras éxito', async () => {
    const { requireAdmin } = await import('@/lib/api-auth');
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      session: { user: { id: 'a1', role: 'ADMIN' } as never, expires: '2100-01-01' } as never,
    });
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ category: 'Nueva Cat' }] as never);
    vi.mocked(prisma.category.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'c2',
          name: 'Nueva Cat',
          slug: 'nueva-cat',
          imageUrl: null,
          isFeatured: true,
          order: 0,
          description: null,
          seoTitle: null,
          googleCategoryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    vi.mocked(prisma.category.createMany).mockResolvedValue({ count: 1 });

    const { POST } = await import('@/app/api/categories/sync/route');
    const response = await POST(
      new Request('http://localhost/api/categories/sync', {
        method: 'POST',
        headers: { Origin: 'http://localhost' },
      }),
    );

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('categories', 'default');
    expect(revalidateTag).toHaveBeenCalledWith('site-shell', 'default');
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('POST /api/categories rechaza sin admin', async () => {
    const { requireAdmin } = await import('@/lib/api-auth');
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 }) as never,
    });

    const { POST } = await import('@/app/api/categories/route');
    const response = await POST(
      new Request('http://localhost/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
        body: JSON.stringify({ name: 'Consolas', slug: 'consolas' }),
      }),
    );

    expect(response.status).toBe(403);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
