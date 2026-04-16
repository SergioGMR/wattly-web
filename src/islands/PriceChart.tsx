import { useEffect, useRef } from 'preact/hooks';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import type { HourlyPrice } from '../lib/types';
import { formatHour, formatPrice } from '../lib/format';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLOR_MAP = {
  light: { green: '#16a34a', orange: '#ea580c', red: '#dc2626' },
  dark: { green: '#4ade80', orange: '#fbbf24', red: '#f87171' },
};

const CHART_CHROME = {
  light: { grid: 'rgba(0,0,0,0.06)', tick: '#6b7280' },
  dark: { grid: 'rgba(255,255,255,0.06)', tick: '#64748b' },
};

function getMode(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

interface Props {
  prices: HourlyPrice[];
}

export default function PriceChart({ prices }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  function buildChart() {
    const canvas = canvasRef.current;
    if (!canvas || prices.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const mode = getMode();
    const colors = COLOR_MAP[mode];
    const chrome = CHART_CHROME[mode];

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: prices.map((p) => formatHour(p.hour)),
        datasets: [
          {
            label: '€/kWh',
            data: prices.map((p) => p.price),
            backgroundColor: prices.map((p) => colors[p.color]),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${formatPrice(ctx.parsed.y)}`,
              title: (items) => `${items[0].label}h`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: chrome.tick },
            grid: { color: chrome.grid },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: chrome.tick,
              callback: (val) => `${Number(val).toFixed(2)}€`,
            },
            grid: { color: chrome.grid },
          },
        },
      },
    });
  }

  useEffect(() => {
    buildChart();

    const handleThemeChange = () => buildChart();
    window.addEventListener('wattly:theme-change', handleThemeChange);

    return () => {
      chartRef.current?.destroy();
      window.removeEventListener('wattly:theme-change', handleThemeChange);
    };
  }, [prices]);

  if (prices.length === 0) {
    return (
      <div class="glass-card flex h-48 items-center justify-center text-gray-400 dark:text-slate-500">
        Sin datos de precios
      </div>
    );
  }

  const colorLabel = (color: string) =>
    color === 'green' ? 'Bajo' : color === 'orange' ? 'Medio' : 'Alto';

  return (
    <div>
      <div class="relative h-48 w-full sm:h-64">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Gráfico de precios de la electricidad por hora"
        />
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
