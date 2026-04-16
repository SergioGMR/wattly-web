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
  green: '#16a34a',
  orange: '#ea580c',
  red: '#dc2626',
};

interface Props {
  prices: HourlyPrice[];
}

export default function PriceChart({ prices }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: prices.map((p) => formatHour(p.hour)),
        datasets: [
          {
            label: '€/kWh',
            data: prices.map((p) => p.price),
            backgroundColor: prices.map((p) => COLOR_MAP[p.color]),
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
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `${Number(val).toFixed(2)}€`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [prices]);

  if (prices.length === 0) {
    return (
      <div class="flex h-48 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
        Sin datos de precios
      </div>
    );
  }

  return (
    <div class="relative h-64 w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Gráfico de precios de la electricidad por hora"
      />
    </div>
  );
}
