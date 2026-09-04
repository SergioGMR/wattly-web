import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPrices,
  fetchTodayPrices,
  fetchTomorrowPrices,
  fetchReePrices,
  fetchReeSpotPrices,
  getMadridDateStr,
  DEFAULT_TIMEOUT_MS,
} from '../../src/lib/api';
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

function createMockReeResponse(baseValues?: number[]) {
  const values = (baseValues ?? Array.from({ length: 24 }, (_, i) => (i + 1) * 10)).map(
    (value, i) => ({
      value,
      percentage: 0.5,
      datetime: `2026-04-16T${String(i).padStart(2, '0')}:00:00.000+02:00`,
    })
  );

  return {
    data: {
      type: 'Precios mercados tiempo real',
      id: 'mer-pre-tie-rea',
    },
    included: [
      {
        type: 'PVPC',
        id: '1001',
        attributes: {
          title: 'PVPC',
          values,
        },
      },
    ],
  };
}

function createMockReeSpotResponse(baseValues?: number[]) {
  const defaultValues = Array.from({ length: 96 }, (_, i) => 100 + i);
  const valuesSource = baseValues ?? defaultValues;
  const values = valuesSource.map((value, i) => ({
    value,
    percentage: 1,
    datetime: `2026-04-17T${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}:00.000+02:00`,
  }));

  return {
    data: {
      type: 'Precios mercados tiempo real',
      id: 'mer-pre-tie-rea',
    },
    included: [
      {
        type: 'Precio mercado spot',
        id: '600',
        attributes: {
          title: 'Precio mercado spot',
          values,
        },
      },
    ],
  };
}

const mockFetch = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(200, { success: true, data: mockPriceData }));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  it('throws on network error when fallback also fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(fetchTodayPrices()).rejects.toThrow('Network error');
  });

  it('throws on malformed JSON when fallback also fails', async () => {
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

  it('throws on non-404 error status when fallback also fails', async () => {
    vi.stubGlobal('fetch', mockFetch(500, {}));
    await expect(fetchTodayPrices()).rejects.toThrow('API error 500');
  });

  it('falls back to REE when primary API returns 500', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockReeResponse()),
        };
      }
      return {
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Primary server down' }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTodayPrices();
    expect(data.source).toBe('apidatos.ree.es');
    expect(data.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to REE when primary API times out', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockReeResponse()),
        };
      }
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTodayPrices();
    expect(data.source).toBe('apidatos.ree.es');
    expect(data.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchTomorrowPrices', () => {
  it('returns data with isForecast: false when available from primary API', async () => {
    const result = await fetchTomorrowPrices();
    expect(result).not.toBeNull();
    expect(result?.date).toBe('2026-04-16');
    expect(result?.isForecast).toBe(false);
  });

  it('falls back to REE PVPC when primary API returns 404 and REE PVPC is available', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockReeResponse()),
        };
      }
      return {
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('apidatos.ree.es');
    expect(data?.isForecast).toBe(false);
    expect(data?.prices).toHaveLength(24);
  });

  it('falls back to REE PVPC when primary API returns 500', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockReeResponse()),
        };
      }
      return {
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Primary server down' }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('apidatos.ree.es');
    expect(data?.isForecast).toBe(false);
    expect(data?.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to REE spot forecast when primary API 404s and PVPC returns null', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockReeSpotResponse()),
        };
      }
      return {
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('apidatos.ree.es (OMIE Spot)');
    expect(data?.isForecast).toBe(true);
    expect(data?.prices).toHaveLength(24);
  });

  it('falls back to REE when primary API times out', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockReeResponse()),
        };
      }
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('apidatos.ree.es');
  });

  it('returns null when primary API fails and all REE fallbacks fail', async () => {
    vi.stubGlobal('fetch', mockFetch(500, {}));
    const data = await fetchTomorrowPrices();
    expect(data).toBeNull();
  });
});

describe('fetchPrices', () => {
  it('uses AbortSignal.timeout default of 3500ms', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: mockPriceData }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    await fetchPrices('/api/prices/today');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/prices/today'),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
    expect(DEFAULT_TIMEOUT_MS).toBe(3500);
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', mockFetch(404, {}));
    const result = await fetchPrices('/api/prices/tomorrow');
    expect(result).toBeNull();
  });

  it('throws on HTTP 500 error', async () => {
    vi.stubGlobal('fetch', mockFetch(500, { error: 'fail' }));
    await expect(fetchPrices('/api/prices/today')).rejects.toThrow('API error 500');
  });
});

describe('fetchReePrices', () => {
  it('correctly maps 24 hourly prices from €/MWh to €/kWh with 4 decimals', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockReeResponse()),
      })
    );

    const result = await fetchReePrices('2026-04-16');
    expect(result).not.toBeNull();
    expect(result?.source).toBe('apidatos.ree.es');
    expect(result?.date).toBe('2026-04-16');
    expect(result?.zone).toBe('peninsula');
    expect(result?.unit).toBe('kWh');
    expect(result?.currency).toBe('EUR');
    expect(result?.prices).toHaveLength(24);

    // 10 €/MWh -> 0.01 €/kWh
    expect(result?.prices[0]).toEqual({
      hour: '00:00-01:00',
      price: 0.01,
      color: 'green',
    });

    // 240 €/MWh -> 0.24 €/kWh
    expect(result?.prices[23]).toEqual({
      hour: '23:00-24:00',
      price: 0.24,
      color: 'red',
    });
  });

  it('correctly assigns 8 green, 8 orange, and 8 red colors for 24 hours', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockReeResponse()),
      })
    );

    const result = await fetchReePrices('2026-04-16');
    const greens = result?.prices.filter((p) => p.color === 'green') ?? [];
    const oranges = result?.prices.filter((p) => p.color === 'orange') ?? [];
    const reds = result?.prices.filter((p) => p.color === 'red') ?? [];

    expect(greens).toHaveLength(8);
    expect(oranges).toHaveLength(8);
    expect(reds).toHaveLength(8);
  });

  it('calculates highlights: average rounded to 5 decimals, min, max, current', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockReeResponse()),
      })
    );

    const result = await fetchReePrices('2026-04-16');
    expect(result?.highlights.min.price).toBe(0.01);
    expect(result?.highlights.max.price).toBe(0.24);
    // Sum of 0.01 + ... + 0.24 = 3.0 / 24 = 0.125
    expect(result?.highlights.average).toBe(0.125);
    expect(result?.highlights.current).toBeDefined();
    expect(result?.highlights.current.hour).toMatch(/^\d{2}:00-\d{2}:00$/);
  });

  it('returns null if indicator 1001 or PVPC is not found in included', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            included: [
              {
                id: '600',
                type: 'Precio mercado spot',
                attributes: { values: [{ value: 100 }] },
              },
            ],
          }),
      })
    );

    const result = await fetchReePrices('2026-04-16');
    expect(result).toBeNull();
  });

  it('returns null if values are empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            included: [
              {
                id: '1001',
                type: 'PVPC',
                attributes: { values: [] },
              },
            ],
          }),
      })
    );

    const result = await fetchReePrices('2026-04-16');
    expect(result).toBeNull();
  });

  it('returns null on HTTP error or network failure', async () => {
    vi.stubGlobal('fetch', mockFetch(500, { error: 'Server error' }));
    const result500 = await fetchReePrices('2026-04-16');
    expect(result500).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const resultNetErr = await fetchReePrices('2026-04-16');
    expect(resultNetErr).toBeNull();
  });
});

describe('fetchReeSpotPrices', () => {
  it('aggregates 96 15-minute values into 24 hourly prices, converts €/MWh to €/kWh with 4 decimals and sets isForecast: true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockReeSpotResponse()),
      })
    );

    const result = await fetchReeSpotPrices('2026-04-17');
    expect(result).not.toBeNull();
    expect(result?.date).toBe('2026-04-17');
    expect(result?.zone).toBe('peninsula');
    expect(result?.currency).toBe('EUR');
    expect(result?.unit).toBe('kWh');
    expect(result?.source).toBe('apidatos.ree.es (OMIE Spot)');
    expect(result?.isForecast).toBe(true);
    expect(result?.prices).toHaveLength(24);

    // Hour 0: (100+101+102+103)/4 = 101.5 €/MWh -> 0.1015 €/kWh
    expect(result?.prices[0]).toEqual({
      hour: '00:00-01:00',
      price: 0.1015,
      color: 'green',
    });

    // Hour 23: (192+193+194+195)/4 = 193.5 €/MWh -> 0.1935 €/kWh
    expect(result?.prices[23]).toEqual({
      hour: '23:00-24:00',
      price: 0.1935,
      color: 'red',
    });
  });

  it('handles 24 direct hourly values correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(
            createMockReeSpotResponse(Array.from({ length: 24 }, (_, i) => (i + 1) * 10))
          ),
      })
    );

    const result = await fetchReeSpotPrices('2026-04-17');
    expect(result).not.toBeNull();
    expect(result?.prices).toHaveLength(24);
    expect(result?.prices[0]).toEqual({
      hour: '00:00-01:00',
      price: 0.01,
      color: 'green',
    });
    expect(result?.prices[23]).toEqual({
      hour: '23:00-24:00',
      price: 0.24,
      color: 'red',
    });
  });

  it('assigns 8 green, 8 orange, and 8 red colors for 24 hours', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockReeSpotResponse()),
      })
    );

    const result = await fetchReeSpotPrices('2026-04-17');
    const greens = result?.prices.filter((p) => p.color === 'green') ?? [];
    const oranges = result?.prices.filter((p) => p.color === 'orange') ?? [];
    const reds = result?.prices.filter((p) => p.color === 'red') ?? [];

    expect(greens).toHaveLength(8);
    expect(oranges).toHaveLength(8);
    expect(reds).toHaveLength(8);
  });

  it('calculates highlights: average, min, max, current', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockReeSpotResponse()),
      })
    );

    const result = await fetchReeSpotPrices('2026-04-17');
    expect(result?.highlights.min.price).toBe(0.1015);
    expect(result?.highlights.max.price).toBe(0.1935);
    expect(result?.highlights.average).toBeGreaterThan(0.1);
    expect(result?.highlights.current).toBeDefined();
    expect(result?.highlights.current.hour).toMatch(/^\d{2}:00-\d{2}:00$/);
  });

  it('finds indicator by title === "Precio mercado spot"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            included: [
              {
                id: 'different-id',
                attributes: {
                  title: 'Precio mercado spot',
                  values: Array.from({ length: 24 }, (_, i) => ({ value: (i + 1) * 10 })),
                },
              },
            ],
          }),
      })
    );

    const result = await fetchReeSpotPrices('2026-04-17');
    expect(result).not.toBeNull();
    expect(result?.prices).toHaveLength(24);
  });

  it('returns null if indicator 600 or spot title is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            included: [
              {
                id: '1001',
                type: 'PVPC',
                attributes: { values: [{ value: 100 }] },
              },
            ],
          }),
      })
    );

    const result = await fetchReeSpotPrices('2026-04-17');
    expect(result).toBeNull();
  });

  it('returns null if values are empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            included: [
              {
                id: '600',
                attributes: { values: [] },
              },
            ],
          }),
      })
    );

    const result = await fetchReeSpotPrices('2026-04-17');
    expect(result).toBeNull();
  });

  it('returns null on HTTP error or network failure', async () => {
    vi.stubGlobal('fetch', mockFetch(500, { error: 'Server error' }));
    const result500 = await fetchReeSpotPrices('2026-04-17');
    expect(result500).toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const resultNet = await fetchReeSpotPrices('2026-04-17');
    expect(resultNet).toBeNull();
  });
});

describe('getMadridDateStr', () => {
  it('returns date string in YYYY-MM-DD format', () => {
    const today = getMadridDateStr(0);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const tomorrow = getMadridDateStr(1);
    expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tomorrow).not.toBe(today);
  });
});
