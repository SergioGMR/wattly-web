import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPrices,
  fetchTodayPrices,
  fetchTomorrowPrices,
  fetchReePrices,
  fetchReeSpotPrices,
  getMadridDateStr,
  assignColors,
  DEFAULT_TIMEOUT_MS,
} from '../../src/lib/api';
import type { PriceData } from '../../src/lib/types';

const mockPriceData: PriceData = {
  date: '2026-04-16',
  zone: 'peninsula',
  currency: 'EUR',
  unit: 'kWh',
  source: 'tarifaluzhora.es',
  prices: Array.from({ length: 24 }, (_, i) => {
    const startHour = String(i).padStart(2, '0');
    const endHour = String(i + 1).padStart(2, '0');
    return {
      hour: `${startHour}:00-${endHour}:00`,
      price: Number((0.05 + i * 0.005).toFixed(4)),
      color: 'green' as const,
    };
  }),
  highlights: {
    average: 0.1075,
    min: { hour: '00:00-01:00', price: 0.05, color: 'green' },
    max: { hour: '23:00-24:00', price: 0.165, color: 'red' },
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
  it('prioritizes REE as the primary official source', async () => {
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
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTodayPrices();
    expect(data.source).toBe('apidatos.ree.es');
    expect(data.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(1);
    expect(String(mockMultiFetch.mock.calls[0][0])).toContain('apidatos.ree.es');
  });

  it('parses fallback response correctly when REE returns no included items', async () => {
    // Default global fetch returns mockPriceData which REE cannot parse, triggering fallback
    const data = await fetchTodayPrices();
    expect(data.date).toBe('2026-04-16');
    expect(data.prices).toHaveLength(24);
    expect(data.highlights.average).toBeCloseTo(0.1075);
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

  it('falls back to primary API when REE returns 500', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'REE down' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTodayPrices();
    expect(data.source).toBe('tarifaluzhora.es');
    expect(data.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to primary API when REE times out', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTodayPrices();
    expect(data.source).toBe('tarifaluzhora.es');
    expect(data.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects REE data when it returns fewer than 23 hours and falls back to primary API', async () => {
    const incompleteRee = createMockReeResponse(Array.from({ length: 20 }, (_, i) => (i + 1) * 10));
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve(incompleteRee),
        };
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTodayPrices();
    expect(data.source).toBe('tarifaluzhora.es');
    expect(data.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects primary API fallback data when it returns fewer than 23 hours', async () => {
    const incompleteFallbackData: PriceData = {
      ...mockPriceData,
      prices: mockPriceData.prices.slice(0, 20),
    };
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'REE down' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: incompleteFallbackData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    await expect(fetchTodayPrices()).rejects.toThrow('Failed to fetch complete today prices');
  });

  it('re-runs assignColors on fallback data to ensure color consistency', async () => {
    const arbitraryPrices = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
      price: i === 7 || i === 8 ? 0.2032 : 0.1 + i * 0.01,
      color: (i === 7 ? 'green' : i === 8 ? 'orange' : 'red') as 'green' | 'orange' | 'red',
    }));

    const mockArbitraryData: PriceData = {
      ...mockPriceData,
      prices: arbitraryPrices,
    };

    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'REE down' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockArbitraryData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTodayPrices();
    expect(data.prices[7].color).toBe(data.prices[8].color);
  });
});

describe('fetchTomorrowPrices', () => {
  it('prioritizes REE PVPC as primary when available', async () => {
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
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('apidatos.ree.es');
    expect(data?.isForecast).toBe(false);
    expect(data?.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to primary API when REE PVPC returns 404 or null', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('tarifaluzhora.es');
    expect(data?.isForecast).toBe(false);
    expect(data?.prices).toHaveLength(24);
  });

  it('falls back to primary API when REE PVPC returns 500', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        return {
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'REE down' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('tarifaluzhora.es');
    expect(data?.isForecast).toBe(false);
    expect(data?.prices).toHaveLength(24);
    expect(mockMultiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to REE spot forecast when primary API and PVPC fail', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        // PVPC has no values, spot has values
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

  it('falls back to primary API when REE PVPC times out', async () => {
    const mockMultiFetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('apidatos.ree.es')) {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockPriceData }),
      };
    });

    vi.stubGlobal('fetch', mockMultiFetch);

    const data = await fetchTomorrowPrices();
    expect(data).not.toBeNull();
    expect(data?.source).toBe('tarifaluzhora.es');
    expect(data?.prices).toHaveLength(24);
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

  it('correctly handles negative prices from solar surplus', async () => {
    // -5 €/MWh -> -0.005 €/kWh
    const reeValues = Array.from({ length: 24 }, (_, i) =>
      i >= 12 && i <= 16 ? -5 - (i - 12) * 2 : (i + 1) * 10
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockReeResponse(reeValues)),
      })
    );

    const result = await fetchReePrices('2026-04-16');
    expect(result).not.toBeNull();
    expect(result?.prices[12].price).toBe(-0.005);
    expect(result?.prices[12].color).toBe('green');
    expect(result?.highlights.min.price).toBeLessThan(0);
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

describe('assignColors', () => {
  it('assigns identical color to hours with the same price or rounding to 3 decimals', () => {
    // 0.2032 and 0.2034 round to 0.203
    const prices = Array.from({ length: 24 }, (_, i) => {
      let price = 0.1 + i * 0.01;
      if (i === 7) price = 0.2032;
      if (i === 8) price = 0.2034;
      return {
        hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
        price,
      };
    });

    const colored = assignColors(prices);
    expect(colored[7].color).toBe(colored[8].color);
  });

  it('assigns identical color even if two identical prices straddle the cutoff boundary', () => {
    const prices = Array.from({ length: 24 }, (_, i) => {
      let price: number;
      if (i < 6) price = 0.05 + i * 0.01;
      else if (i <= 8) price = 0.203;
      else price = 0.25 + (i - 9) * 0.02;
      return {
        hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
        price,
      };
    });

    const colored = assignColors(prices);
    expect(colored[6].color).toBe('green');
    expect(colored[7].color).toBe('green');
    expect(colored[8].color).toBe('green');
  });

  it('handles negative prices correctly', () => {
    const prices = Array.from({ length: 24 }, (_, i) => {
      const price = i >= 12 && i <= 16 ? -0.005 - (i - 12) * 0.002 : 0.05 + i * 0.01;
      return {
        hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
        price,
      };
    });

    const colored = assignColors(prices);
    for (let i = 12; i <= 16; i++) {
      expect(colored[i].color).toBe('green');
    }
  });

  it('assigns all green when greenCutoff === redCutoff', () => {
    const prices = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
      price: 0.15,
    }));

    const colored = assignColors(prices);
    expect(colored.every((p) => p.color === 'green')).toBe(true);
  });

  it('returns empty array when prices array is empty', () => {
    expect(assignColors([])).toEqual([]);
  });
});
