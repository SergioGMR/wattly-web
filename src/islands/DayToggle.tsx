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

  function handleTabKeyDown(e: KeyboardEvent) {
    const tabs: Day[] = ['today', 'tomorrow'];
    const currentIndex = tabs.indexOf(activeDay);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      if (tabs[nextIndex] === 'tomorrow' && !tomorrow) return;
      setActiveDay(tabs[nextIndex]);
      document.getElementById(`tab-${tabs[nextIndex]}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (tabs[nextIndex] === 'tomorrow' && !tomorrow) return;
      setActiveDay(tabs[nextIndex]);
      document.getElementById(`tab-${tabs[nextIndex]}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveDay('today');
      document.getElementById('tab-today')?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      if (tomorrow) {
        setActiveDay('tomorrow');
        document.getElementById('tab-tomorrow')?.focus();
      }
    }
  }

  return (
    <div>
      {/* Tab navigation */}
      <div
        class="mb-4 flex gap-2"
        role="tablist"
        aria-label="Seleccionar día"
        tabIndex={-1}
        onKeyDown={handleTabKeyDown}
      >
        <button
          role="tab"
          aria-selected={activeDay === 'today'}
          aria-controls="panel-today"
          id="tab-today"
          tabIndex={activeDay === 'today' ? 0 : -1}
          onClick={() => setActiveDay('today')}
          class={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeDay === 'today'
              ? 'bg-blue-500/90 text-white dark:bg-blue-500/80'
              : 'bg-black/5 text-gray-600 hover:bg-black/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
          }`}
        >
          Hoy
        </button>
        <button
          role="tab"
          aria-selected={activeDay === 'tomorrow'}
          aria-controls="panel-tomorrow"
          id="tab-tomorrow"
          tabIndex={activeDay === 'tomorrow' ? 0 : -1}
          disabled={!tomorrow}
          onClick={() => tomorrow && setActiveDay('tomorrow')}
          class={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeDay === 'tomorrow'
              ? 'bg-blue-500/90 text-white dark:bg-blue-500/80'
              : 'bg-black/5 text-gray-600 hover:bg-black/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
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
            <div class="flex gap-4 text-sm text-gray-600 dark:text-slate-400">
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
          <div class="glass-card flex h-48 items-center justify-center">
            <p class="text-gray-500 dark:text-slate-500">
              Datos de mañana disponibles a partir de las 20:00 (hora España)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
