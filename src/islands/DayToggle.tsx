import { useState } from 'preact/hooks';
import type { HourlyPrice, Highlights } from '../lib/types';
import CurrentPrice from './CurrentPrice';
import PriceChart from './PriceChart';
import ApplianceConfigurator from './ApplianceConfigurator';
import { PRESET_APPLIANCES, calcApplianceWindow } from '../lib/appliances';
import {
  formatPrice,
  formatHour,
  formatDate,
  formatDateShort,
  formatHourIndex,
} from '../lib/format';

type Day = 'today' | 'tomorrow';

export interface DayData {
  prices: HourlyPrice[];
  highlights: Highlights;
  date: string;
  isForecast?: boolean;
}

interface Props {
  today: DayData;
  tomorrow: DayData | null;
  serverCurrent?: HourlyPrice;
}

const colorTextMap = {
  green: 'text-price-green',
  orange: 'text-price-orange',
  red: 'text-price-red',
};

export default function DayToggle({ today, tomorrow, serverCurrent }: Props) {
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

  const applianceWindows =
    currentData && currentData.prices.length >= 3
      ? PRESET_APPLIANCES.map((appliance) => calcApplianceWindow(appliance, currentData.prices))
      : [];

  return (
    <div>
      {/* Tab navigation */}
      <div
        class="mb-6 flex gap-2"
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
          Hoy · {formatDateShort(today.date)}
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
          {tomorrow
            ? tomorrow.isForecast
              ? `Mañana · ${formatDateShort(tomorrow.date)} (Previsión)`
              : `Mañana · ${formatDateShort(tomorrow.date)}`
            : 'Mañana (disponible ~13:00)'}
        </button>
      </div>

      {/* Panel */}
      <div role="tabpanel" id={`panel-${activeDay}`} aria-labelledby={`tab-${activeDay}`}>
        {currentData ? (
          <div class="space-y-8 sm:space-y-12">
            {/* Date Display */}
            <p class="text-center text-sm text-gray-500 dark:text-slate-400">
              Datos del{' '}
              <time dateTime={currentData.date} class="font-medium">
                {formatDate(currentData.date)}
              </time>
            </p>

            {/* Hero Widget */}
            {activeDay === 'today' ? (
              <CurrentPrice
                hourly={today.prices}
                fallbackCurrent={serverCurrent ?? today.highlights.current}
                dateShort={formatDateShort(today.date)}
              />
            ) : (
              tomorrow && (
                <section
                  class="glass-card hero-glow bg-price-green-bg relative overflow-hidden p-5 text-center sm:p-8"
                  aria-label="Previsión del precio mañana"
                >
                  <p class="relative z-10 text-xs font-medium tracking-widest text-gray-500 uppercase dark:text-slate-400">
                    Mejor momento para consumir · {formatDateShort(tomorrow.date)}
                  </p>
                  <p class="text-price-green relative z-10 mt-2 text-4xl font-bold tabular-nums sm:text-6xl">
                    {formatPrice(tomorrow.highlights.min.price)}
                  </p>
                  <p class="text-price-green relative z-10 mt-3 inline-block rounded-full border border-current/20 bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm dark:bg-white/5">
                    ↓ Mínimo a las {formatHour(tomorrow.highlights.min.hour)}h
                  </p>
                </section>
              )
            )}

            {/* Aviso de Previsión */}
            {currentData.isForecast && (
              <div
                class="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-800 sm:text-sm dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300"
                role="note"
                aria-label="Aviso de previsión"
              >
                <span class="shrink-0 text-base leading-none select-none" aria-hidden="true">
                  ℹ️
                </span>
                <p class="leading-relaxed">
                  <strong>Previsión preliminar:</strong> estos precios están basados en la subasta
                  del mercado diario spot de OMIE. Los precios definitivos del PVPC se publican
                  alrededor de las 20:30.
                </p>
              </div>
            )}

            {/* Precios por hora (Chart) */}
            <section>
              <h2 class="mb-4 text-xs font-semibold tracking-widest text-blue-500 uppercase dark:text-blue-400">
                Precios por hora
              </h2>
              <PriceChart prices={currentData.prices} />
            </section>

            {/* Resumen del día (Highlights) */}
            <section aria-label="Resumen de precios del día">
              <h2 class="mb-4 text-xs font-semibold tracking-widest text-blue-500 uppercase dark:text-blue-400">
                Resumen del día
              </h2>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="glass-card p-4">
                  <p class="text-xs font-medium tracking-widest text-slate-600 uppercase dark:text-slate-400">
                    <span aria-hidden="true">↓</span> Mínimo del día
                  </p>
                  <p
                    class={`mt-2 text-2xl font-bold tabular-nums ${colorTextMap[currentData.highlights.min.color]}`}
                  >
                    {formatPrice(currentData.highlights.min.price)}
                  </p>
                  {currentData.highlights.min.hour && (
                    <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      a las {formatHour(currentData.highlights.min.hour)}h
                    </p>
                  )}
                </div>
                <div class="glass-card p-4">
                  <p class="text-xs font-medium tracking-widest text-slate-600 uppercase dark:text-slate-400">
                    <span aria-hidden="true">↑</span> Máximo del día
                  </p>
                  <p
                    class={`mt-2 text-2xl font-bold tabular-nums ${colorTextMap[currentData.highlights.max.color]}`}
                  >
                    {formatPrice(currentData.highlights.max.price)}
                  </p>
                  {currentData.highlights.max.hour && (
                    <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      a las {formatHour(currentData.highlights.max.hour)}h
                    </p>
                  )}
                </div>
                <div class="glass-card p-4">
                  <p class="text-xs font-medium tracking-widest text-slate-600 uppercase dark:text-slate-400">
                    <span aria-hidden="true">~</span> Promedio del día
                  </p>
                  <p class="text-price-orange mt-2 text-2xl font-bold tabular-nums">
                    {formatPrice(currentData.highlights.average)}
                  </p>
                </div>
              </div>
            </section>

            {/* Mejor hora para tus electrodomésticos (Appliance Tips) */}
            <section aria-label="Mejores horas para electrodomésticos">
              <h2 class="mb-4 text-xs font-semibold tracking-widest text-blue-500 uppercase dark:text-blue-400">
                Mejor hora para tus electrodomésticos
              </h2>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {applianceWindows.map(({ appliance, startHour, endHour, avgPrice, savings }) => (
                  <div key={appliance.id} class="glass-card p-4">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl" aria-hidden="true">
                        {appliance.icon}
                      </span>
                      <div>
                        <p class="font-semibold text-gray-800 dark:text-slate-200">
                          {appliance.name}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-slate-400">
                          {appliance.durationHours}h de uso
                        </p>
                      </div>
                    </div>
                    <div class="bg-price-green-bg mt-3 rounded-lg px-3 py-2">
                      <p class="text-price-green text-sm font-medium">
                        {formatHourIndex(startHour)} – {formatHourIndex(endHour)}
                      </p>
                      <p class="mt-0.5 text-xs text-gray-600 dark:text-slate-400">
                        {formatPrice(avgPrice)} promedio · {savings.toFixed(0)}% de ahorro
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Configura tus electrodomésticos */}
            <ApplianceConfigurator prices={currentData.prices} />
          </div>
        ) : (
          <div class="glass-card flex h-48 items-center justify-center">
            <p class="text-gray-500 dark:text-slate-400">
              Datos de mañana disponibles a partir de las 13:00 (hora España)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
