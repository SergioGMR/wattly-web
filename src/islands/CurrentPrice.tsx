import { useEffect, useState } from 'preact/hooks';
import type { HourlyPrice } from '../lib/types';
import { formatPrice, getDisplayHour, formatHourIndex } from '../lib/format';

interface Props {
  hourly: HourlyPrice[];
  fallbackCurrent: HourlyPrice;
  dateShort: string;
}

const colorMap = {
  green: { bg: 'bg-price-green-bg', text: 'text-price-green', label: 'Precio bajo' },
  orange: { bg: 'bg-price-orange-bg', text: 'text-price-orange', label: 'Precio medio' },
  red: { bg: 'bg-price-red-bg', text: 'text-price-red', label: 'Precio alto' },
};

interface ResolvedState {
  current: HourlyPrice;
  hourStr: string;
  tzLabel: string;
}

function resolve(hourly: HourlyPrice[], fallback: HourlyPrice): ResolvedState {
  const display = getDisplayHour();
  const prefix = formatHourIndex(display.lookupIndex);
  const match = hourly.find((h) => h.hour.startsWith(prefix));
  return {
    current: match ?? fallback,
    hourStr: display.hourStr,
    tzLabel: display.label,
  };
}

function HeroSkeleton({ dateShort }: { dateShort: string }) {
  return (
    <section
      class="glass-card hero-glow relative animate-pulse overflow-hidden p-5 text-center sm:p-8"
      aria-label="Cargando precio actual"
    >
      <p class="relative z-10 text-xs font-medium tracking-widest text-gray-500 uppercase dark:text-slate-400">
        Precio ahora · {dateShort}
      </p>
      <div class="mx-auto mt-3 h-10 w-44 rounded-lg bg-gray-200 sm:h-14 dark:bg-slate-700" />
      <div class="mx-auto mt-4 h-7 w-28 rounded-full bg-gray-200 dark:bg-slate-700" />
    </section>
  );
}

export default function CurrentPrice({ hourly, fallbackCurrent, dateShort }: Props) {
  const [state, setState] = useState<ResolvedState | null>(null);

  useEffect(() => {
    function tick() {
      setState(resolve(hourly, fallbackCurrent));
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hourly, fallbackCurrent]);

  if (!state) return <HeroSkeleton dateShort={dateShort} />;

  const { bg, text, label } = colorMap[state.current.color];

  return (
    <section
      class={`glass-card hero-glow relative overflow-hidden p-5 sm:p-8 ${bg} text-center`}
      aria-label="Precio actual de la electricidad"
    >
      <p class="relative z-10 text-xs font-medium tracking-widest text-gray-500 uppercase dark:text-slate-400">
        Precio ahora ({state.hourStr}h{state.tzLabel ? ` ${state.tzLabel}` : ''}) · {dateShort}
      </p>
      <p class={`relative z-10 mt-2 text-4xl font-bold tabular-nums sm:text-6xl ${text}`}>
        {formatPrice(state.current.price)}
      </p>
      <p
        class={`relative z-10 mt-3 inline-block rounded-full border border-current/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm ${text} bg-white/20 dark:bg-white/5`}
      >
        {label}
      </p>
    </section>
  );
}
