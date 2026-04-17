/**
 * Format a price in €/kWh with Spanish locale.
 * e.g. 0.0433 → "0,043 €/kWh"
 */
export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(price)} €/kWh`;
}

/**
 * Extract the start hour from an hour range string.
 * e.g. "14:00-15:00" → "14:00"
 */
export function formatHour(hourRange: string): string {
  return hourRange.split('-')[0];
}

/**
 * Format a date string (YYYY-MM-DD) in Spanish long format.
 * e.g. "2026-04-16" → "16 de abril de 2026"
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format hour index (0-23) as "HH:00".
 */
export function formatHourIndex(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * Format a date string (YYYY-MM-DD) as short day + month.
 * e.g. "2026-04-17" → "17 abr"
 */
export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace(/\.$/, '');
}

function getHourIndexForTz(now: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat('es-ES', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).format(now);
  const n = parseInt(h, 10);
  return n === 24 ? 0 : n;
}

/**
 * Peninsular Spain current hour (0-23), ignoring client TZ.
 * Used to index the hourly price array (PVPC publishes peninsular hours).
 */
export function getPeninsularHourIndex(now: Date = new Date()): number {
  return getHourIndexForTz(now, 'Europe/Madrid');
}

/**
 * Resolve the client's IANA timezone, with a safe fallback.
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';
  } catch {
    return 'Europe/Madrid';
  }
}

export interface DisplayHour {
  hourStr: string;
  label: string;
  lookupIndex: number;
}

/**
 * Hour shown to the user, adapted to their region.
 * PVPC applies per local hour of each region (peninsular, Canarias).
 * `lookupIndex` is the index to use against the 24-value hourly price array
 * — user's local hour for peninsular/Canarias, peninsular hour as fallback
 * for foreign TZs.
 */
export function getDisplayHour(
  now: Date = new Date(),
  userTz: string = getUserTimezone()
): DisplayHour {
  const peninsularZones = ['Europe/Madrid', 'Europe/Ceuta'];

  if (peninsularZones.includes(userTz)) {
    const idx = getPeninsularHourIndex(now);
    return { hourStr: formatHourIndex(idx), label: '', lookupIndex: idx };
  }

  if (userTz === 'Atlantic/Canary') {
    const idx = getHourIndexForTz(now, 'Atlantic/Canary');
    return { hourStr: formatHourIndex(idx), label: '', lookupIndex: idx };
  }

  const idx = getPeninsularHourIndex(now);
  return { hourStr: formatHourIndex(idx), label: 'hora peninsular', lookupIndex: idx };
}
