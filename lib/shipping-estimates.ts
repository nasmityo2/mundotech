/**
 * MEJORA 2.3 / ADM-11 (AUDITORIA-2026-07): estimados de envío editables desde
 * Admin → Configuración, persistidos en AppConfig. Se muestran en el paso de
 * envío del checkout para bajar la ansiedad de "¿cuánto y cuándo llega?".
 *
 * Modelo: nota por método (tienda/MRW/ZOOM) + overrides opcionales por estado
 * (tabla). Todo texto libre en tono de la tienda, p. ej.:
 *   "2–4 días hábiles · lo pagas al recibir (~$3–6 según destino)".
 */
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const SHIPPING_ESTIMATES_KEY = 'shipping_estimates';

const stateEstimateSchema = z.object({
  state: z.string().min(1).max(60),
  note:  z.string().min(1).max(200),
});

export const shippingEstimatesSchema = z.object({
  /** Nota bajo "Retirar en tienda". Vacío = no se muestra. */
  tienda: z.string().max(200).optional().default(''),
  /** Nota general para MRW (fallback si el estado no tiene override). */
  mrw: z.string().max(200).optional().default(''),
  /** Nota general para ZOOM (fallback si el estado no tiene override). */
  zoom: z.string().max(200).optional().default(''),
  /** Overrides por estado (aplican a MRW y ZOOM). */
  states: z.array(stateEstimateSchema).max(30).optional().default([]),
});

export type ShippingEstimates = z.infer<typeof shippingEstimatesSchema>;

export const DEFAULT_SHIPPING_ESTIMATES: ShippingEstimates = {
  tienda: '',
  mrw: '',
  zoom: '',
  states: [],
};

export async function readShippingEstimates(): Promise<ShippingEstimates> {
  try {
    const record = await prisma.appConfig.findUnique({
      where: { key: SHIPPING_ESTIMATES_KEY },
    });
    if (!record?.value) return DEFAULT_SHIPPING_ESTIMATES;
    const parsed = shippingEstimatesSchema.safeParse(JSON.parse(record.value));
    if (!parsed.success) {
      console.error('[shipping-estimates] JSON corrupto en AppConfig — usando defaults:', parsed.error.flatten());
      return DEFAULT_SHIPPING_ESTIMATES;
    }
    return parsed.data;
  } catch (err) {
    console.error('[shipping-estimates] lectura falló — usando defaults:', err);
    return DEFAULT_SHIPPING_ESTIMATES;
  }
}

export async function writeShippingEstimates(value: ShippingEstimates): Promise<void> {
  await prisma.appConfig.upsert({
    where:  { key: SHIPPING_ESTIMATES_KEY },
    update: { value: JSON.stringify(value) },
    create: { key: SHIPPING_ESTIMATES_KEY, value: JSON.stringify(value) },
  });
}

/** Nota a mostrar para un método + estado (override por estado > nota del método). */
export function estimateFor(
  estimates: ShippingEstimates,
  method: 'tienda' | 'mrw' | 'zoom',
  state?: string | null,
): string {
  if (method === 'tienda') return estimates.tienda.trim();
  if (state) {
    const override = estimates.states.find(
      (s) => s.state.trim().toLowerCase() === state.trim().toLowerCase(),
    );
    if (override) return override.note.trim();
  }
  return estimates[method].trim();
}
