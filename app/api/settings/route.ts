import { NextResponse } from 'next/server';
import { readSettings, writeSettings, storeSettingsSchema } from '@/lib/data-store';
import { requireAdmin } from '@/lib/api-auth';

/**
 * GET /api/settings
 * Public callers receive only the non-sensitive storefront fields.
 * Authenticated ADMIN callers receive the full settings object.
 */
export async function GET() {
  const auth = await requireAdmin();

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
  } catch {
    return NextResponse.json(
      { success: false, message: 'Error al guardar la configuración.' },
      { status: 500 }
    );
  }
}
