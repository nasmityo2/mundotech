import { describe, it, expect } from 'vitest';
import { normalizePermissionDependencies } from '@/lib/admin-permissions';

describe('normalizePermissionDependencies', () => {
  it('PAYMENTS implica ORDERS', () => {
    expect(normalizePermissionDependencies(['PAYMENTS'])).toEqual(['ORDERS', 'PAYMENTS']);
  });

  it('CUSTOMER_DATA_EXPORT implica ORDERS', () => {
    expect(normalizePermissionDependencies(['CUSTOMER_DATA_EXPORT'])).toEqual(['ORDERS', 'CUSTOMER_DATA_EXPORT']);
  });
});
