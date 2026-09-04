import type { HourlyPrice, PriceData } from './types';
import { getPeninsularHourIndex } from './format';

const BASE_URL = import.meta.env?.PUBLIC_API_URL ?? 'https://precio-lux-api.vercel.app';
export const DEFAULT_TIMEOUT_MS = 3500;

export function getMadridDateStr(offsetDays = 0): string {
  const now = new Date();
  const madridTodayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
  }).format(now);
  if (offsetDays === 0) {
    return madridTodayStr;
  }
  const [year, month, day] = madridTodayStr.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return target.toISOString().slice(0, 10);
}

export async function fetchPrices(
  path: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<PriceData | null> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(`Network error fetching ${path}: ${String(err)}`);
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status} fetching ${path}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Invalid JSON from ${path}`);
  }

  const data = json as { success: boolean; data: PriceData };
  return data.data;
}

interface ReeIncludedItem {
  id?: string | number;
  type?: string;
  attributes?: {
    title?: string;
    values?: Array<{
      value?: number;
      percentage?: number;
      datetime?: string;
    }>;
  };
}

interface ReeApiResponse {
  data?: unknown;
  included?: ReeIncludedItem[];
}

function assignColors(hourlyPrices: { hour: string; price: number }[]): HourlyPrice[] {
  if (hourlyPrices.length === 24) {
    const sorted = hourlyPrices
      .map((p, index) => ({ index, price: p.price }))
      .sort((a, b) => a.price - b.price);

    const greenIndices = new Set(sorted.slice(0, 8).map((s) => s.index));
    const redIndices = new Set(sorted.slice(16).map((s) => s.index));

    return hourlyPrices.map((p, i) => ({
      ...p,
      color: greenIndices.has(i) ? 'green' : redIndices.has(i) ? 'red' : 'orange',
    }));
  }

  const minPrice = Math.min(...hourlyPrices.map((p) => p.price));
  const maxPrice = Math.max(...hourlyPrices.map((p) => p.price));
  const range = maxPrice - minPrice;

  return hourlyPrices.map((p) => {
    let color: 'green' | 'orange' | 'red' = 'orange';
    if (range > 0) {
      if (p.price <= minPrice + range * 0.33) {
        color = 'green';
      } else if (p.price >= minPrice + range * 0.67) {
        color = 'red';
      }
    } else {
      color = 'green';
    }
    return { ...p, color };
  });
}

export async function fetchReePrices(
  dateStr: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<PriceData | null> {
  const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${dateStr}T00:00&end_date=${dateStr}T23:59&time_trunc=hour`;
  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (err) {
    console.warn(`[wattly] Network error fetching REE prices for ${dateStr}: ${String(err)}`);
    return null;
  }

  if (!response.ok) {
    console.warn(`[wattly] REE API returned status ${response.status} for ${dateStr}`);
    return null;
  }

  let json: ReeApiResponse;
  try {
    json = (await response.json()) as ReeApiResponse;
  } catch {
    console.warn(`[wattly] Invalid JSON from REE API for ${dateStr}`);
    return null;
  }

  const included = Array.isArray(json.included)
    ? json.included
    : Array.isArray((json.data as { included?: ReeIncludedItem[] })?.included)
      ? (json.data as { included?: ReeIncludedItem[] }).included
      : null;

  if (!included) {
    return null;
  }

  const pvpc = included.find((item) => String(item.id) === '1001' || item.type === 'PVPC');

  if (!pvpc?.attributes?.values || pvpc.attributes.values.length === 0) {
    return null;
  }

  const rawValues = pvpc.attributes.values;
  const valuesToProcess = rawValues.length >= 24 ? rawValues.slice(0, 24) : rawValues;

  const rawPrices = valuesToProcess.map((item, i) => {
    const startHour = String(i).padStart(2, '0');
    const endHour = String(i + 1).padStart(2, '0');
    const hour = `${startHour}:00-${endHour}:00`;
    const price = Number(((item.value ?? 0) / 1000).toFixed(4));
    return { hour, price };
  });

  const prices = assignColors(rawPrices);

  const sum = prices.reduce((acc, p) => acc + p.price, 0);
  const average = Number((sum / prices.length).toFixed(5));
  const min = prices.reduce((lowest, p) => (p.price < lowest.price ? p : lowest), prices[0]);
  const max = prices.reduce((highest, p) => (p.price > highest.price ? p : highest), prices[0]);

  const currentHourIndex = getPeninsularHourIndex();
  const current =
    prices.find((p) => p.hour.startsWith(`${String(currentHourIndex).padStart(2, '0')}:`)) ??
    prices[currentHourIndex] ??
    prices[0];

  return {
    date: dateStr,
    zone: 'peninsula',
    currency: 'EUR',
    unit: 'kWh',
    source: 'apidatos.ree.es',
    isForecast: false,
    prices,
    highlights: {
      average,
      min,
      max,
      current,
    },
  };
}

export async function fetchReeSpotPrices(
  dateStr: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<PriceData | null> {
  const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${dateStr}T00:00&end_date=${dateStr}T23:59&time_trunc=hour`;
  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (err) {
    console.warn(`[wattly] Network error fetching REE spot prices for ${dateStr}: ${String(err)}`);
    return null;
  }

  if (!response.ok) {
    console.warn(`[wattly] REE API returned status ${response.status} for ${dateStr} (spot)`);
    return null;
  }

  let json: ReeApiResponse;
  try {
    json = (await response.json()) as ReeApiResponse;
  } catch {
    console.warn(`[wattly] Invalid JSON from REE API for ${dateStr} (spot)`);
    return null;
  }

  const included = Array.isArray(json.included)
    ? json.included
    : Array.isArray((json.data as { included?: ReeIncludedItem[] })?.included)
      ? (json.data as { included?: ReeIncludedItem[] }).included
      : null;

  if (!included) {
    return null;
  }

  const spot = included.find(
    (item) =>
      String(item.id) === '600' ||
      item.attributes?.title === 'Precio mercado spot' ||
      item.type === 'Precio mercado spot'
  );

  if (!spot?.attributes?.values || spot.attributes.values.length === 0) {
    return null;
  }

  const rawValues = spot.attributes.values;
  const hourlyMwh: number[] = [];

  if (rawValues.length >= 96) {
    for (let h = 0; h < 24; h++) {
      const slice = rawValues.slice(h * 4, h * 4 + 4);
      const avg = slice.reduce((sum, item) => sum + (item.value ?? 0), 0) / slice.length;
      hourlyMwh.push(avg);
    }
  } else if (rawValues.length === 24) {
    for (let h = 0; h < 24; h++) {
      hourlyMwh.push(rawValues[h].value ?? 0);
    }
  } else if (rawValues.length > 24) {
    const chunks = Math.floor(rawValues.length / 4);
    for (let h = 0; h < Math.min(24, chunks); h++) {
      const slice = rawValues.slice(h * 4, h * 4 + 4);
      const avg = slice.reduce((sum, item) => sum + (item.value ?? 0), 0) / slice.length;
      hourlyMwh.push(avg);
    }
  } else {
    for (const item of rawValues) {
      hourlyMwh.push(item.value ?? 0);
    }
  }

  if (hourlyMwh.length === 0) {
    return null;
  }

  const rawPrices = hourlyMwh.map((mwh, i) => {
    const startHour = String(i).padStart(2, '0');
    const endHour = String(i + 1).padStart(2, '0');
    const hour = `${startHour}:00-${endHour}:00`;
    const price = Number((mwh / 1000).toFixed(4));
    return { hour, price };
  });

  const prices = assignColors(rawPrices);

  const sum = prices.reduce((acc, p) => acc + p.price, 0);
  const average = Number((sum / prices.length).toFixed(5));
  const min = prices.reduce((lowest, p) => (p.price < lowest.price ? p : lowest), prices[0]);
  const max = prices.reduce((highest, p) => (p.price > highest.price ? p : highest), prices[0]);

  const currentHourIndex = getPeninsularHourIndex();
  const current =
    prices.find((p) => p.hour.startsWith(`${String(currentHourIndex).padStart(2, '0')}:`)) ??
    prices[currentHourIndex] ??
    prices[0];

  return {
    date: dateStr,
    zone: 'peninsula',
    currency: 'EUR',
    unit: 'kWh',
    source: 'apidatos.ree.es (OMIE Spot)',
    isForecast: true,
    prices,
    highlights: {
      average,
      min,
      max,
      current,
    },
  };
}

export async function fetchTodayPrices(): Promise<PriceData> {
  let primaryError: Error | null = null;

  try {
    const data = await fetchPrices('/api/prices/today');
    if (data) {
      return { ...data, isForecast: false };
    }
    primaryError = new Error('Today prices returned 404 unexpectedly');
    console.warn('[wattly] Primary API returned 404 for today. Falling back to REE...');
  } catch (err) {
    primaryError = err instanceof Error ? err : new Error(String(err));
    console.warn(
      `[wattly] Primary API failed for today prices: ${primaryError.message}. Falling back to REE...`
    );
  }

  try {
    const reeData = await fetchReePrices(getMadridDateStr(0));
    if (reeData) {
      return { ...reeData, isForecast: false };
    }
  } catch (reeErr) {
    console.warn(`[wattly] REE fallback failed for today prices: ${String(reeErr)}`);
  }

  throw primaryError ?? new Error('Failed to fetch today prices from primary API and REE fallback');
}

export async function fetchTomorrowPrices(): Promise<PriceData | null> {
  const tomorrowMadridStr = getMadridDateStr(1);

  try {
    const data = await fetchPrices('/api/prices/tomorrow');
    if (data) {
      return { ...data, isForecast: false };
    }
  } catch (err) {
    console.warn(
      `[wattly] Primary API failed for tomorrow prices: ${String(err)}. Falling back to REE...`
    );
  }

  try {
    const reeData = await fetchReePrices(tomorrowMadridStr);
    if (reeData) {
      return { ...reeData, isForecast: false };
    }
  } catch (err) {
    console.warn(`[wattly] REE fallback failed for tomorrow prices: ${String(err)}`);
  }

  try {
    const spotData = await fetchReeSpotPrices(tomorrowMadridStr);
    if (spotData) {
      return spotData;
    }
  } catch (err) {
    console.warn(`[wattly] REE spot fallback failed for tomorrow prices: ${String(err)}`);
  }

  return null;
}
