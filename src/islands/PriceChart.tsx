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

  return (
    <div class="relative h-48 w-full sm:h-64">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Gráfico de precios de la electricidad por hora"
      />
    </div>
  );
}
