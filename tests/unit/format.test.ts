import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  formatPrice,
  formatHour,
  formatDate,
  formatHourIndex,
  formatDateShort,
  getPeninsularHourIndex,
  getDisplayHour,
} from '../../src/lib/format';

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

describe('formatDateShort', () => {
  it('formats day + short month', () => {
    const result = formatDateShort('2026-04-17');
    expect(result).toContain('17');
    expect(result.toLowerCase()).toContain('abr');
  });

  it('strips trailing dot from month abbreviation', () => {
    expect(formatDateShort('2026-04-17').endsWith('.')).toBe(false);
  });

  it('formats January', () => {
    const result = formatDateShort('2026-01-05');
    expect(result).toContain('5');
    expect(result.toLowerCase()).toContain('ene');
  });
});

describe('getPeninsularHourIndex', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 18 at 16:02 UTC during CEST (DST)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T16:02:00Z'));
    expect(getPeninsularHourIndex()).toBe(18);
  });

  it('returns 13 at 12:00 UTC during CET (no DST)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    expect(getPeninsularHourIndex()).toBe(13);
  });

  it('normalizes 24 to 0 at midnight peninsular', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T22:00:00Z'));
    expect(getPeninsularHourIndex()).toBe(0);
  });

  it('accepts explicit Date argument', () => {
    expect(getPeninsularHourIndex(new Date('2026-04-17T16:02:00Z'))).toBe(18);
  });
});

describe('getDisplayHour', () => {
  const sample = new Date('2026-04-17T16:02:00Z');

  it('peninsular TZ: empty label, lookup = peninsular hour', () => {
    const result = getDisplayHour(sample, 'Europe/Madrid');
    expect(result.label).toBe('');
    expect(result.hourStr).toBe('18:00');
    expect(result.lookupIndex).toBe(18);
  });

  it('Ceuta is treated as peninsular', () => {
    const result = getDisplayHour(sample, 'Europe/Ceuta');
    expect(result.label).toBe('');
    expect(result.hourStr).toBe('18:00');
    expect(result.lookupIndex).toBe(18);
  });

  it('Atlantic/Canary: empty label, lookup = Canarias local hour', () => {
    const result = getDisplayHour(sample, 'Atlantic/Canary');
    expect(result.label).toBe('');
    expect(result.hourStr).toBe('17:00');
    expect(result.lookupIndex).toBe(17);
  });

  it('foreign TZ: label "hora peninsular" + peninsular lookup', () => {
    const result = getDisplayHour(sample, 'America/Argentina/Buenos_Aires');
    expect(result.label).toBe('hora peninsular');
    expect(result.hourStr).toBe('18:00');
    expect(result.lookupIndex).toBe(18);
  });
});
