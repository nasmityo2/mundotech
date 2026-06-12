/**
 * PRD-204: helpers de conversión Prisma.Decimal → number.
 *
 * Las columnas monetarias en BD usan DECIMAL(12,2) para evitar errores de
 * redondeo binario (Float). Prisma devuelve objetos Decimal (decimal.js) que
 * no son directamente asignables a `number`. Estos helpers convierten en la
 * frontera BD→aplicación; toda la lógica interna sigue usando `number`.
 */
import { Prisma } from '@prisma/client';

type DecimalLike = Prisma.Decimal | { toNumber(): number } | number | null | undefined;

/** Convierte un Decimal de Prisma a number. Null/undefined → 0. */
export function d(val: DecimalLike): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  return val.toNumber();
}

/** Convierte un Decimal nullable de Prisma a number | null. */
export function dn(val: DecimalLike): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  return val.toNumber();
}
