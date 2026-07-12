import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { rejectInvalidMutationOrigin } from '@/lib/security';

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

/**
 * PRD-255: este GET solo lo consume el editor /admin/home-manager — la home
 * pública lee estas claves server-side. Se exige admin para no exponer la
 * configuración editorial (benefits, flash deals, shelves) a scraping.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
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
  } catch (error) {
    console.error('[GET /api/config/homepage]', error);
    return NextResponse.json({ error: 'Error al leer la configuración.' }, { status: 500 });
  }
}

// ── PUT — upserts a single key ────────────────────────────────────────────────

/** Límite de tamaño del payload JSON para AppConfig (100 KB). */
const MAX_PAYLOAD_BYTES = 100 * 1024;

export async function PUT(request: Request) {
  const originCheck = rejectInvalidMutationOrigin(request);
  if (originCheck) return originCheck;

  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  // PRD-260: rechazar payloads sobredimensionados antes de parsear.
  const rawText = await request.text();
  if (rawText.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: `El payload supera el límite permitido de ${MAX_PAYLOAD_BYTES / 1024} KB.` },
      { status: 413 },
    );
  }

  let body: { key: string; value: unknown };
  try {
    body = JSON.parse(rawText) as { key: string; value: unknown };
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

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
  revalidateTag('homepage-config', 'default');

  return NextResponse.json({ success: true });
}
