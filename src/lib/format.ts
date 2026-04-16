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
