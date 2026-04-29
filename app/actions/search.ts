'use server';

import { prisma } from '@/lib/prisma';

export interface SearchResult {
  id:       string;
  slug:     string | null;
  name:     string;
  price:    number;
  category: string;
  brand:    string | null;
  images:   string[];
}

export async function searchProducts(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  return prisma.product.findMany({
    where: {
      OR: [
        { name:        { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category:    { contains: q, mode: 'insensitive' } },
        { brand:       { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 7,
    orderBy: { createdAt: 'desc' },
    select: {
      id:       true,
      slug:     true,
      name:     true,
      price:    true,
      category: true,
      brand:    true,
      images:   true,
    },
  });
}
