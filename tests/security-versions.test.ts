import { describe, expect, it } from 'vitest';
import {
  isAllowedNextVersion,
  parseStableSemver,
} from '@/scripts/check-security-versions.mjs';

describe('parseStableSemver', () => {
  it('parsea una versión estable', () => {
    expect(parseStableSemver('16.2.10')).toEqual({
      major: 16,
      minor: 2,
      patch: 10,
    });
  });

  it.each([
    '',
    '16',
    '16.2',
    '16.2.6-canary.1',
    'v16.2.6',
    'invalid',
  ])('rechaza formato no estable: %s', (version) => {
    expect(parseStableSemver(version)).toBeNull();
  });
});

describe('isAllowedNextVersion', () => {
  it.each([
    ['16.2.5', false],
    ['16.2.6', true],
    ['16.2.10', true],
    ['16.3.0', true],
    ['16.10.0', true],
    ['16.1.99', false],
    ['15.9.99', false],
    ['17.0.0', false],
    ['16.2.6-canary.1', false],
  ])('%s → %s', (version, expected) => {
    expect(isAllowedNextVersion(version)).toBe(expected);
  });
});
