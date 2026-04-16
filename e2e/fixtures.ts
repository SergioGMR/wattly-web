import type { HourlyPrice, PriceData } from '../src/lib/types';

export function makeMockPrices(base = 0.05): HourlyPrice[] {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
    price: parseFloat((base + i * 0.01).toFixed(4)),
    color: i < 8 ? 'green' : i < 16 ? 'orange' : ('red' as const),
  }));
}

export function makeMockPriceData(overrides?: Partial<PriceData>): PriceData {
  const prices = makeMockPrices();
  return {
    date: '2026-04-16',
    zone: 'peninsula',
    currency: 'EUR',
    unit: 'kWh',
    source: 'tarifaluzhora.es',
    prices,
    highlights: {
      average: 0.17,
      min: prices[0],
      max: prices[23],
      current: prices[10],
    },
    ...overrides,
  };
}

export const mockApiResponse = (data: PriceData) => ({
  success: true,
  data,
});
