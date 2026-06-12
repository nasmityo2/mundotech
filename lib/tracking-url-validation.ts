/**
 * tracking-url-validation.ts (PRD-267 / PRD-268)
 * Validadores Zod compartidos por las rutas admin que guardan tracking
 * (`PATCH /api/orders/[id]` y `PUT /api/orders/[id]/status`).
 *
 * - PRD-267: `trackingUrl` solo https — el cliente la abre como <a href> en su
 *   detalle de pedido; nada de http plano ni otros esquemas.
 * - PRD-268: `trackingPhotoUrl` restringida al CDN público de R2.
 */
import { z } from 'zod';
import { isR2PublicHttpsUrl } from '@/lib/r2-public-url';

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** URL de seguimiento del transportista (https obligatorio). */
export const trackingUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isHttpsUrl, 'La URL de seguimiento debe ser https://…');

/** Foto de la guía/paquete (https + alojada en R2). */
export const trackingPhotoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    isR2PublicHttpsUrl,
    'La foto de tracking debe estar alojada en el CDN de imágenes de la tienda (R2).',
  );
