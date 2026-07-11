import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { getPrivateProofReadUrl, isR2PublicUrl } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/payment-proof
 *
 * Devuelve una URL prefirmada (corta duración) para que el ADMIN visualice el
 * comprobante de pago. Los nuevos comprobantes se almacenan en el bucket privado;
 * los legacy (paymentProofUrl) se sirven temporalmente si el host es válido.
 *
 * SESIÓN 04 — solo ADMIN. Los guests/CLIENT reciben 403.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json({ error: 'ID del pedido requerido.' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { paymentProofKey: true, paymentProofUrl: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  }

  // Prioridad: paymentProofKey (nuevo sistema privado)
  if (order.paymentProofKey) {
    try {
      const url = await getPrivateProofReadUrl(order.paymentProofKey, 180);
      return NextResponse.json(
        { url, expiresIn: 180 },
        {
          headers: {
            'Cache-Control': 'private, no-store',
            'Referrer-Policy': 'no-referrer',
          },
        },
      );
    } catch (err) {
      console.error('[payment-proof] Error generando URL firmada:', err);
      return NextResponse.json(
        { error: 'No se pudo generar la URL del comprobante.' },
        { status: 500 },
      );
    }
  }

  // Fallback legacy: paymentProofUrl solo si el host es el R2 público configurado
  // @deprecated SESIÓN 04 — eliminar cuando se migren todos los registros legacy.
  if (order.paymentProofUrl) {
    if (isR2PublicUrl(order.paymentProofUrl)) {
      return NextResponse.json(
        { legacyUrl: order.paymentProofUrl, deprecation: 'use paymentProofKey' },
        {
          headers: {
            'Cache-Control': 'private, no-store',
            'Referrer-Policy': 'no-referrer',
          },
        },
      );
    }
    // Host ajeno: no servir la URL aunque exista en BD (seguridad)
    console.warn(
      '[payment-proof] paymentProofUrl con host no confiable, omitiendo. Order:',
      id,
    );
  }

  return NextResponse.json({ error: 'El pedido no tiene comprobante de pago.' }, { status: 404 });
}
