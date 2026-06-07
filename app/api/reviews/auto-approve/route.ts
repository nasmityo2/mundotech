import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/api-auth';
import { readReviewsAutoApprove, writeReviewsAutoApprove } from '@/lib/reviews';

/** GET /api/reviews/auto-approve — estado actual de auto-aprobación (admin). */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;
  const autoApprove = await readReviewsAutoApprove();
  return NextResponse.json({ autoApprove }, { headers: { 'Cache-Control': 'no-store' } });
}

const schema = z.object({ autoApprove: z.boolean() });

/** PUT /api/reviews/auto-approve — activa/desactiva auto-aprobación (admin). */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  try {
    await writeReviewsAutoApprove(parsed.data.autoApprove);
    return NextResponse.json({ autoApprove: parsed.data.autoApprove });
  } catch (error) {
    console.error('[PUT /api/reviews/auto-approve] Error inesperado:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la configuración.' }, { status: 500 });
  }
}
