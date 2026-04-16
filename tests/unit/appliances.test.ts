import { describe, it, expect } from 'vitest';
import { findBestWindow, calcApplianceWindow, PRESET_APPLIANCES } from '../../src/lib/appliances';
import type { HourlyPrice } from '../../src/lib/types';

function makePrices(values: number[]): HourlyPrice[] {
  return values.map((price, i) => ({
    hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
    price,
    color: price < 0.1 ? 'green' : price < 0.2 ? 'orange' : ('red' as const),
  }));
}

const realPrices = makePrices([
  0.08, 0.07, 0.06, 0.05, 0.06, 0.07, 0.09, 0.12, 0.18, 0.22, 0.25, 0.27, 0.26, 0.24, 0.22, 0.19,
  0.21, 0.28, 0.3, 0.29, 0.25, 0.18, 0.12, 0.09,
]);

describe('findBestWindow', () => {
  it('finds the cheapest 2-hour window in real-like data', () => {
    const result = findBestWindow(realPrices, 2);
    // Hours 2-3 (0.06 + 0.05) / 2 = 0.055 — tied with 3-4, algorithm picks first
    expect(result.startHour).toBe(2);
    expect(result.endHour).toBe(4);
    expect(result.avgPrice).toBeCloseTo(0.055);
  });

  it('finds the cheapest 3-hour window', () => {
    const result = findBestWindow(realPrices, 3);
    // Hours 2-4 (0.06 + 0.05 + 0.06) / 3 ≈ 0.0567
    expect(result.startHour).toBe(2);
    expect(result.avgPrice).toBeCloseTo(0.0567, 3);
  });

  it('handles all equal prices — any window is valid', () => {
    const equalPrices = makePrices(Array(24).fill(0.1));
    const result = findBestWindow(equalPrices, 2);
    expect(result.avgPrice).toBeCloseTo(0.1);
    expect(result.savings).toBeCloseTo(0);
  });

  it('handles window of 1 hour', () => {
    const result = findBestWindow(realPrices, 1);
    expect(result.startHour).toBe(3); // min price at hour 3
    expect(result.avgPrice).toBeCloseTo(0.05);
  });

  it('handles maximum window of 24 hours', () => {
    const result = findBestWindow(realPrices, 24);
    expect(result.startHour).toBe(0);
    expect(result.endHour).toBe(24);
  });

  it('throws on empty array', () => {
    expect(() => findBestWindow([], 2)).toThrow('prices array cannot be empty');
  });

  it('throws when durationHours exceeds array length', () => {
    const shortPrices = makePrices([0.1, 0.2, 0.3]);
    expect(() => findBestWindow(shortPrices, 5)).toThrow('durationHours must be between 1 and 3');
  });

  it('throws when durationHours is 0', () => {
    expect(() => findBestWindow(realPrices, 0)).toThrow();
  });

  it('computes savings percentage correctly', () => {
    const result = findBestWindow(realPrices, 2);
    expect(result.savings).toBeGreaterThan(0);
    expect(result.savings).toBeLessThan(100);
  });
});

describe('calcApplianceWindow', () => {
  it('assigns the appliance to the result', () => {
    const washer = PRESET_APPLIANCES[0];
    const result = calcApplianceWindow(washer, realPrices);
    expect(result.appliance.id).toBe('washer');
    expect(result.appliance.durationHours).toBe(2);
  });
});
