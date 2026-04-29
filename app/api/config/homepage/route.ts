import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { revalidatePath } from 'next/cache';

// ── Keys managed by this endpoint ────────────────────────────────────────────

export const HOMEPAGE_KEYS = ['homepage_benefits', 'homepage_flashdeals', 'homepage_shelves'] as const;
export type HomepageKey = (typeof HOMEPAGE_KEYS)[number];

// ── Schemas ───────────────────────────────────────────────────────────────────

const benefitItemSchema = z.object({
  title: z.string().min(1),
  sub:   z.string().min(1),
});

const homepageBenefitsSchema = z.array(benefitItemSchema).min(1).max(8);

const homepageFlashDealsSchema = z.object({
  title:   z.string().min(1),
  endHour: z.number().int().min(0).max(23),
});

const shelfSchema = z.object({
  title:    z.string().min(1),
  badge:    z.string().optional().default(''),
  subtitle: z.string().optional().default(''),
});

const homepageShelvesSchema = z.object({
  bestsellers:  shelfSchema,
  newest:       shelfSchema,
  recommended:  shelfSchema,
});

const schemas: Record<HomepageKey, z.ZodTypeAny> = {
  homepage_benefits:  homepageBenefitsSchema,
  homepage_flashdeals: homepageFlashDealsSchema,
  homepage_shelves:   homepageShelvesSchema,
};

// ── GET — returns all three keys at once ─────────────────────────────────────

export async function GET() {
  const records = await prisma.appConfig.findMany({
    where: { key: { in: [...HOMEPAGE_KEYS] } },
  });

  const result: Record<string, unknown> = {};
  for (const key of HOMEPAGE_KEYS) {
    const row = records.find(r => r.key === key);
    try {
      result[key] = row ? JSON.parse(row.value) : null;
    } catch {
      result[key] = null;
    }
  }
  return NextResponse.json(result);
}

// ── PUT — upserts a single key ────────────────────────────────────────────────

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await request.json() as { key: string; value: unknown };

  if (!HOMEPAGE_KEYS.includes(body.key as HomepageKey)) {
    return NextResponse.json({ error: 'Clave no permitida.' }, { status: 400 });
  }

  const schema = schemas[body.key as HomepageKey];
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await prisma.appConfig.upsert({
    where:  { key: body.key },
    update: { value: JSON.stringify(parsed.data) },
    create: { key: body.key, value: JSON.stringify(parsed.data) },
  });

  revalidatePath('/', 'layout');

  return NextResponse.json({ success: true });
}
