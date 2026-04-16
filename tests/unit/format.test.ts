import { describe, it, expect } from 'vitest';
import { formatPrice, formatHour, formatDate, formatHourIndex } from '../../src/lib/format';

describe('formatPrice', () => {
  it('formats price with Spanish locale (comma decimal)', () => {
    expect(formatPrice(0.0433)).toBe('0,043 €/kWh');
  });

  it('formats higher price', () => {
    expect(formatPrice(0.277)).toBe('0,277 €/kWh');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0,000 €/kWh');
  });
});

describe('formatHour', () => {
  it('extracts start hour from range', () => {
    expect(formatHour('14:00-15:00')).toBe('14:00');
  });

  it('handles midnight', () => {
    expect(formatHour('00:00-01:00')).toBe('00:00');
  });

  it('handles 23:00', () => {
    expect(formatHour('23:00-00:00')).toBe('23:00');
  });
});

describe('formatDate', () => {
  it('formats a date in Spanish long format', () => {
    const result = formatDate('2026-04-16');
    expect(result).toContain('2026');
    expect(result).toContain('abril');
    expect(result).toContain('16');
  });

  it('formats January correctly', () => {
    const result = formatDate('2026-01-01');
    expect(result).toContain('enero');
  });

  it('formats December correctly', () => {
    const result = formatDate('2026-12-31');
    expect(result).toContain('diciembre');
  });
});

describe('formatHourIndex', () => {
  it('pads single-digit hours', () => {
    expect(formatHourIndex(3)).toBe('03:00');
  });

  it('handles midnight', () => {
    expect(formatHourIndex(0)).toBe('00:00');
  });

  it('handles 23:00', () => {
    expect(formatHourIndex(23)).toBe('23:00');
  });
});
