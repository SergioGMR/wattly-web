import type { PriceData } from './types';

const BASE_URL = import.meta.env.PUBLIC_API_URL ?? 'https://precio-lux-api.vercel.app';

async function fetchPrices(path: string): Promise<PriceData | null> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`);
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

export async function fetchTodayPrices(): Promise<PriceData> {
  const data = await fetchPrices('/api/prices/today');
  if (!data) {
    throw new Error('Today prices returned 404 unexpectedly');
  }
  return data;
}

export async function fetchTomorrowPrices(): Promise<PriceData | null> {
  return fetchPrices('/api/prices/tomorrow');
}
