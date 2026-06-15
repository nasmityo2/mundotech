import { describe, it, expect } from 'vitest';
import { roundUpToStep, calcSellingPriceUsd } from '@/lib/pricing-formula';

describe('roundUpToStep', () => {
  it('redondea hacia arriba a $0.05', () => {
    expect(roundUpToStep(1.42)).toBe(1.45);
    expect(roundUpToStep(1.21)).toBe(1.25);
    expect(roundUpToStep(1.28)).toBe(1.30);
    expect(roundUpToStep(1.50)).toBe(1.50);
    expect(roundUpToStep(10.80)).toBe(10.80);
    expect(roundUpToStep(1.25)).toBe(1.25);
  });
});

describe('calcSellingPriceUsd', () => {
  it('aplica margen, factor y redondeo', () => {
    expect(calcSellingPriceUsd(4, 80, 1.5)).toBe(10.8);
    expect(calcSellingPriceUsd(1, 80, 1.5)).toBe(2.7);
    expect(calcSellingPriceUsd(0.9, 80, 1.5)).toBe(2.45);
    expect(calcSellingPriceUsd(2.15, 80, 1.5)).toBe(5.85);
    expect(calcSellingPriceUsd(0, 80, 1.5)).toBe(0);
  });
});
