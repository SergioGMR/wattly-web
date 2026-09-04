import { useState } from 'preact/hooks';
import type { HourlyPrice } from '../lib/types';
import { formatHour, formatPrice } from '../lib/format';

const COLOR_CLASSES: Record<HourlyPrice['color'], string> = {
  green: 'fill-[#16a34a] dark:fill-[#4ade80]',
  orange: 'fill-[#ea580c] dark:fill-[#fbbf24]',
  red: 'fill-[#dc2626] dark:fill-[#f87171]',
};

function formatTick(val: number): string {
  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(val);
  return `${formatted} €/kWh`;
}

function shouldShowTick(index: number, total: number): boolean {
  if (total <= 7) return true;
  return (
    index === 0 ||
    index === 4 ||
    index === 8 ||
    index === 12 ||
    index === 16 ||
    index === 20 ||
    index === total - 1
  );
}

function formatHourTick(hourStr: string, index: number): string {
  const start = hourStr.split('-')[0];
  if (start && start.includes(':')) {
    return `${start.split(':')[0]}h`;
  }
  return `${String(index).padStart(2, '0')}h`;
}

function calculateYScale(prices: HourlyPrice[]) {
  const maxPrice = Math.max(...prices.map((p) => p.price), 0);
  const targetMax = maxPrice > 0 ? maxPrice * 1.1 : 0.1;

  const roughStep = targetMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep || 0.01)));
  const normalized = roughStep / magnitude;
  let niceStep: number;
  if (normalized <= 1) niceStep = 1 * magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const yMax = niceStep * 4;
  const ticks = [0, niceStep, niceStep * 2, niceStep * 3, yMax];
  return { yMax, ticks };
}

interface Props {
  prices: HourlyPrice[];
}

export default function PriceChart({ prices }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (prices.length === 0) {
    return (
      <div class="glass-card flex h-48 items-center justify-center text-gray-500 dark:text-slate-400">
        Sin datos de precios
      </div>
    );
  }

  const colorLabel = (color: string) =>
    color === 'green' ? 'Bajo' : color === 'orange' ? 'Medio' : 'Alto';

  // SVG dimensions & margins
  const plotLeft = 75;
  const plotTop = 20;
  const plotWidth = 705;
  const plotHeight = 180;
  const plotBottom = plotTop + plotHeight;

  const { yMax, ticks } = calculateYScale(prices);
  const slotWidth = plotWidth / prices.length;

  return (
    <div>
      <div class="relative h-48 w-full sm:h-64">
        <svg
          viewBox="0 0 800 240"
          role="img"
          aria-label="Gráfico de precios de la electricidad por hora"
          class="h-full w-full overflow-visible"
        >
          {/* Y-axis grid lines and tick labels */}
          {ticks.map((t) => {
            const y = plotBottom - (t / yMax) * plotHeight;
            return (
              <g key={`y-${t}`}>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotLeft + plotWidth}
                  y2={y}
                  class="stroke-gray-200 dark:stroke-slate-800"
                  stroke-width="1"
                  stroke-dasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={plotLeft - 8}
                  y={y}
                  text-anchor="end"
                  dominant-baseline="middle"
                  class="fill-gray-500 text-[10px] font-medium tabular-nums select-none dark:fill-slate-400"
                >
                  {formatTick(t)}
                </text>
              </g>
            );
          })}

          {/* X-axis baseline */}
          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={plotLeft + plotWidth}
            y2={plotBottom}
            class="stroke-gray-300 dark:stroke-slate-700"
            stroke-width="1"
          />

          {/* X-axis hour ticks */}
          {prices.map((p, i) => {
            if (!shouldShowTick(i, prices.length)) return null;
            const slotCenterX = plotLeft + i * slotWidth + slotWidth / 2;
            return (
              <g key={`xtick-${p.hour}`}>
                <line
                  x1={slotCenterX}
                  y1={plotBottom}
                  x2={slotCenterX}
                  y2={plotBottom + 4}
                  class="stroke-gray-300 dark:stroke-slate-700"
                  stroke-width="1"
                />
                <text
                  x={slotCenterX}
                  y={plotBottom + 18}
                  text-anchor="middle"
                  class="fill-gray-500 text-[11px] select-none dark:fill-slate-400"
                >
                  {formatHourTick(p.hour, i)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {prices.map((p, i) => {
            const slotX = plotLeft + i * slotWidth;
            const barWidth = Math.min(22, Math.max(6, slotWidth - 4));
            const barX = slotX + (slotWidth - barWidth) / 2;
            const rawHeight = yMax > 0 ? (p.price / yMax) * plotHeight : 0;
            const barHeight = Math.max(2, rawHeight);
            const barY = plotBottom - barHeight;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={p.hour}
                class="cursor-pointer focus:outline-none"
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${formatHour(p.hour)}h: ${formatPrice(p.price)}`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
                onTouchStart={() => setHoveredIndex(i)}
              >
                <title>{`${formatHour(p.hour)}h: ${formatPrice(p.price)}`}</title>
                {/* Full column invisible hit area for responsive hovering */}
                <rect
                  x={slotX}
                  y={plotTop}
                  width={slotWidth}
                  height={plotHeight}
                  fill="transparent"
                />
                {/* Visual bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  ry={3}
                  class={`${COLOR_CLASSES[p.color]} transition-opacity duration-150 ${
                    hoveredIndex !== null && !isHovered ? 'opacity-45' : 'opacity-100'
                  }`}
                />
              </g>
            );
          })}

          {/* Hover tooltip */}
          {hoveredIndex !== null &&
            prices[hoveredIndex] &&
            (() => {
              const hovered = prices[hoveredIndex];
              const slotCenterX = plotLeft + hoveredIndex * slotWidth + slotWidth / 2;
              const rawHeight = yMax > 0 ? (hovered.price / yMax) * plotHeight : 0;
              const barY = plotBottom - Math.max(2, rawHeight);
              const tooltipWidth = 110;
              const tooltipHeight = 42;
              const tooltipX = Math.max(
                plotLeft,
                Math.min(plotLeft + plotWidth - tooltipWidth, slotCenterX - tooltipWidth / 2)
              );
              const tooltipY = barY > plotTop + 50 ? barY - 48 : barY + 8;

              return (
                <g pointer-events="none" class="transition-all duration-150">
                  {/* Guideline */}
                  <line
                    x1={slotCenterX}
                    y1={plotTop}
                    x2={slotCenterX}
                    y2={plotBottom}
                    class="stroke-gray-400/40 dark:stroke-slate-500/40"
                    stroke-width="1"
                    stroke-dasharray="2 2"
                  />
                  {/* Tooltip Card */}
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx={6}
                    ry={6}
                    class="fill-gray-900/90 stroke-gray-700/50 dark:fill-slate-800/95 dark:stroke-slate-600/50"
                    stroke-width="1"
                  />
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 16}
                    text-anchor="middle"
                    class="fill-gray-200 text-[11px] font-medium select-none dark:fill-slate-200"
                  >
                    {formatHour(hovered.hour)}h
                  </text>
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 32}
                    text-anchor="middle"
                    class="fill-white text-xs font-bold tabular-nums select-none dark:fill-emerald-400"
                  >
                    {formatPrice(hovered.price)}
                  </text>
                </g>
              );
            })()}
        </svg>
      </div>
      <details class="mt-2">
        <summary class="cursor-pointer text-sm text-blue-500 dark:text-blue-400">
          Ver datos en tabla
        </summary>
        <div class="mt-2 max-h-48 overflow-auto rounded-lg border border-black/10 dark:border-white/10">
          <table class="w-full text-left text-sm">
            <caption class="sr-only">Precios de la electricidad por hora</caption>
            <thead class="sticky top-0 bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium text-gray-700 dark:text-slate-300">
                  Hora
                </th>
                <th scope="col" class="px-3 py-2 font-medium text-gray-700 dark:text-slate-300">
                  Precio
                </th>
                <th scope="col" class="px-3 py-2 font-medium text-gray-700 dark:text-slate-300">
                  Nivel
                </th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.hour} class="border-t border-black/5 dark:border-white/5">
                  <td class="px-3 py-1.5 text-gray-600 dark:text-slate-400">
                    {formatHour(p.hour)}h
                  </td>
                  <td class="px-3 py-1.5 text-gray-800 tabular-nums dark:text-slate-200">
                    {formatPrice(p.price)}
                  </td>
                  <td class="px-3 py-1.5 text-gray-600 dark:text-slate-400">
                    {colorLabel(p.color)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
