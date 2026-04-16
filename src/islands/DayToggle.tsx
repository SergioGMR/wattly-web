import { useState } from 'preact/hooks';
import type { HourlyPrice, Highlights } from '../lib/types';
import PriceChart from './PriceChart';
import { formatPrice, formatHour } from '../lib/format';

type Day = 'today' | 'tomorrow';

interface DayData {
  prices: HourlyPrice[];
  highlights: Highlights;
}

interface Props {
  today: DayData;
  tomorrow: DayData | null;
}

export default function DayToggle({ today, tomorrow }: Props) {
  const [activeDay, setActiveDay] = useState<Day>('today');

  const currentData = activeDay === 'today' ? today : tomorrow;

  return (
    <div>
      {/* Tab navigation */}
      <div class="mb-4 flex gap-2" role="tablist" aria-label="Seleccionar día">
        <button
          role="tab"
          aria-selected={activeDay === 'today'}
          aria-controls="panel-today"
          id="tab-today"
          onClick={() => setActiveDay('today')}
          class={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeDay === 'today'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Hoy
        </button>
        <button
          role="tab"
          aria-selected={activeDay === 'tomorrow'}
          aria-controls="panel-tomorrow"
          id="tab-tomorrow"
          disabled={!tomorrow}
          onClick={() => tomorrow && setActiveDay('tomorrow')}
          class={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeDay === 'tomorrow'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Mañana {!tomorrow && '(disponible ~20:00)'}
        </button>
      </div>

      {/* Panel */}
      <div role="tabpanel" id={`panel-${activeDay}`} aria-labelledby={`tab-${activeDay}`}>
        {currentData ? (
          <div class="space-y-4">
            <PriceChart prices={currentData.prices} />

            {/* Quick highlights under chart */}
            <div class="flex gap-4 text-sm text-gray-600">
              <span>
                Mín:{' '}
                <strong class="text-price-green">
                  {formatPrice(currentData.highlights.min.price)}
                </strong>{' '}
                a las {formatHour(currentData.highlights.min.hour)}h
              </span>
              <span>
                Máx:{' '}
                <strong class="text-price-red">
                  {formatPrice(currentData.highlights.max.price)}
                </strong>{' '}
                a las {formatHour(currentData.highlights.max.hour)}h
              </span>
            </div>
          </div>
        ) : (
          <div class="flex h-48 items-center justify-center rounded-xl bg-gray-100">
            <p class="text-gray-500">
              Datos de mañana disponibles a partir de las 20:00 (hora España)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
