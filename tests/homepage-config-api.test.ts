import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/admin-access-server', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  rejectInvalidMutationOrigin: vi.fn(() => null),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    appConfig: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    product: {
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { requirePermission } from '@/lib/admin-access-server';
import { rejectInvalidMutationOrigin } from '@/lib/security';
import { PUT } from '@/app/api/config/homepage/route';
import { DEFAULT_HOMEPAGE_SHELVES } from '@/lib/homepage-config';

describe('PUT /api/config/homepage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rejectInvalidMutationOrigin).mockReturnValue(null);
    vi.mocked(requirePermission).mockResolvedValue({
      authorized: true,
    } as never);
  });

  it('payload no autorizado se rechaza', async () => {
    vi.mocked(requirePermission).mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const req = new Request('http://localhost/api/config/homepage', {
      method: 'PUT',
      body: JSON.stringify({
        key: 'homepage_free_shipping',
        value: { enabled: true, text: 'Envío gratis por MRW' },
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('rechaza origin inválido', async () => {
    vi.mocked(rejectInvalidMutationOrigin).mockReturnValue(
      NextResponse.json({ error: 'Invalid origin' }, { status: 403 }),
    );
    const req = new Request('http://localhost/api/config/homepage', {
      method: 'PUT',
      body: JSON.stringify({
        key: 'homepage_free_shipping',
        value: { enabled: true, text: 'Envío gratis por MRW' },
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it('rechaza texto MRW vacío', async () => {
    const req = new Request('http://localhost/api/config/homepage', {
      method: 'PUT',
      body: JSON.stringify({
        key: 'homepage_free_shipping',
        value: { enabled: true, text: '   ' },
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('rechaza shelves con más de 8 destacados', async () => {
    const req = new Request('http://localhost/api/config/homepage', {
      method: 'PUT',
      body: JSON.stringify({
        key: 'homepage_shelves',
        value: {
          ...DEFAULT_HOMEPAGE_SHELVES,
          featuredProductIds: Array.from({ length: 9 }, (_, i) => `id-${i}`),
        },
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});
