import { describe, expect, it } from 'vitest';
import {
  VALID_ORDER_STATUSES,
  VALID_REVIEW_STATUSES,
  parseProductSpecs,
} from '@/lib/definitions';

describe('estados de pedido (R2 / PRD-122)', () => {
  it('VALID_ORDER_STATUSES coincide con el CHECK de la migración prd_infra_datos_cache', () => {
    // Si esto cambia, hay que actualizar el CHECK "Order_status_valid" en una
    // nueva migración Prisma (lib/definitions.ts PRIMERO, luego schema/migración).
    expect(VALID_ORDER_STATUSES).toEqual([
      'Pendiente',
      'En Proceso',
      'Enviado',
      'Entregado',
      'Cancelado',
    ]);
  });

  it('VALID_REVIEW_STATUSES coincide con el enum ReviewStatus de Prisma', () => {
    expect(VALID_REVIEW_STATUSES).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });
});

describe('parseProductSpecs', () => {
  it('filtra specs malformadas', () => {
    expect(
      parseProductSpecs([
        { name: 'RAM', value: '8GB' },
        { name: '', value: 'vacío' },
        { name: 'sin value' },
        42,
      ]),
    ).toEqual([{ name: 'RAM', value: '8GB' }]);
  });

  it('devuelve [] para null/no-array', () => {
    expect(parseProductSpecs(null)).toEqual([]);
    expect(parseProductSpecs('x')).toEqual([]);
  });
});
