import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTodayPrices, fetchTomorrowPrices } from '../../src/lib/api';
import type { PriceData } from '../../src/lib/types';

const mockPriceData: PriceData = {
  date: '2026-04-16',
  zone: 'peninsula',
  currency: 'EUR',
  unit: 'kWh',
  source: 'tarifaluzhora.es',
  prices: [
    { hour: '00:00-01:00', price: 0.05, color: 'green' },
    { hour: '01:00-02:00', price: 0.06, color: 'green' },
  ],
  highlights: {
    average: 0.055,
    min: { hour: '00:00-01:00', price: 0.05, color: 'green' },
    max: { hour: '01:00-02:00', price: 0.06, color: 'green' },
    current: { hour: '00:00-01:00', price: 0.05, color: 'green' },
  },
};

const mockFetch = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(200, { success: true, data: mockPriceData }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchTodayPrices', () => {
  it('parses a successful response correctly', async () => {
    const data = await fetchTodayPrices();
    expect(data.date).toBe('2026-04-16');
    expect(data.prices).toHaveLength(2);
    expect(data.highlights.average).toBe(0.055);
  });

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(fetchTodayPrices()).rejects.toThrow('Network error');
  });

  it('throws on malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token')),
      })
    );
    await expect(fetchTodayPrices()).rejects.toThrow('Invalid JSON');
  });

  it('throws on non-404 error status', async () => {
    vi.stubGlobal('fetch', mockFetch(500, {}));
    await expect(fetchTodayPrices()).rejects.toThrow('API error 500');
  });
});

describe('fetchTomorrowPrices', () => {
  it('returns null on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      })
    );
    const result = await fetchTomorrowPrices();
    expect(result).toBeNull();
  });

  it('returns data when available', async () => {
    const result = await fetchTomorrowPrices();
    expect(result).not.toBeNull();
    expect(result?.date).toBe('2026-04-16');
  });
});
