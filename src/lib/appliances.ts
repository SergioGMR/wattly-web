import type { Appliance, ApplianceWindow, HourlyPrice } from './types';

export const PRESET_APPLIANCES: Appliance[] = [
  {
    id: 'washer',
    name: 'Lavadora',
    icon: '🫧',
    durationHours: 2,
    isCustom: false,
  },
  {
    id: 'dryer',
    name: 'Secadora',
    icon: '♨️',
    durationHours: 3,
    isCustom: false,
  },
  {
    id: 'dishwasher',
    name: 'Lavavajillas',
    icon: '🍽️',
    durationHours: 2,
    isCustom: false,
  },
];

/**
 * Finds the optimal time window to run an appliance using sliding window algorithm.
 * O(24) — trivial complexity.
 */
export function findBestWindow(prices: HourlyPrice[], durationHours: number): ApplianceWindow {
  if (prices.length === 0) {
    throw new Error('prices array cannot be empty');
  }
  if (durationHours < 1 || durationHours > prices.length) {
    throw new Error(`durationHours must be between 1 and ${prices.length}, got ${durationHours}`);
  }

  let bestStart = 0;
  let bestAvg = Infinity;
  let worstAvg = -Infinity;

  for (let i = 0; i <= prices.length - durationHours; i++) {
    const windowPrices = prices.slice(i, i + durationHours);
    const avg = windowPrices.reduce((sum, p) => sum + p.price, 0) / durationHours;

    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = i;
    }
    if (avg > worstAvg) {
      worstAvg = avg;
    }
  }

  const savings = worstAvg > 0 ? ((worstAvg - bestAvg) / worstAvg) * 100 : 0;

  return {
    appliance: PRESET_APPLIANCES[0], // placeholder — caller should set the real appliance
    startHour: bestStart,
    endHour: bestStart + durationHours,
    avgPrice: bestAvg,
    savings,
  };
}

export function calcApplianceWindow(appliance: Appliance, prices: HourlyPrice[]): ApplianceWindow {
  const window = findBestWindow(prices, appliance.durationHours);
  return { ...window, appliance };
}
