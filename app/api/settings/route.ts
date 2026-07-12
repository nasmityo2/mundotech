import { NextResponse } from 'next/server';
import { readSettings, writeSettings, storeSettingsSchema } from '@/lib/data-store';
import { requireAdmin } from '@/lib/api-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { rejectInvalidMutationOrigin } from '@/lib/security';

/**
 * GET /api/settings
 * Public callers receive only the non-sensitive storefront fields.
 * Authenticated ADMIN callers receive the full settings object.
 * PRD-281: el subset público va con rate limit por IP (anti-enumeración
 * de datos de contacto / scraping).
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();

  if (!auth.authorized) {
    const ip = getClientIp(request);
    if (await rateLimit(`settings:get:${ip}`, { limit: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
    }
  }

  const settings = await readSettings();

  if (!auth.authorized) {
    // Return only the fields safe for public consumption
    return NextResponse.json({
      storeName: settings.storeName,
      phone:     settings.phone,
      email:     settings.email,
    });
  }

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const originCheck = rejectInvalidMutationOrigin(request);
  if (originCheck) return originCheck;

  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parsed = storeSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Datos inválidos.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await writeSettings(parsed.data);
    return NextResponse.json({ success: true, message: 'Configuración guardada.' });
  } catch (error) {
    // PRD-043: logging del fallo (antes el catch tragaba el error).
    console.error('[PUT /api/settings]', error);
    return NextResponse.json(
      { success: false, message: 'Error al guardar la configuración.' },
      { status: 500 }
    );
  }
}
