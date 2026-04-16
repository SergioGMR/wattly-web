import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import PriceChart from '../../src/islands/PriceChart';
import type { HourlyPrice } from '../../src/lib/types';

// Chart.js requires canvas — mock it in happy-dom
vi.mock('chart.js', () => ({
  Chart: class MockChart {
    static register() {}
    constructor() {}
    destroy() {}
  },
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Tooltip: {},
  Legend: {},
}));

const mockPrices: HourlyPrice[] = [
  { hour: '00:00-01:00', price: 0.05, color: 'green' },
  { hour: '01:00-02:00', price: 0.08, color: 'orange' },
  { hour: '02:00-03:00', price: 0.15, color: 'red' },
];

describe('PriceChart', () => {
  it('renders a canvas element', () => {
    const { container } = render(<PriceChart prices={mockPrices} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('renders with correct aria-label on canvas', () => {
    render(<PriceChart prices={mockPrices} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeTruthy();
  });

  it('receives data without crashing', () => {
    expect(() => render(<PriceChart prices={mockPrices} />)).not.toThrow();
  });

  it('handles empty array without error — shows fallback', () => {
    render(<PriceChart prices={[]} />);
    expect(screen.getByText('Sin datos de precios')).toBeTruthy();
  });

  describe('data table accessibility', () => {
    it('renders a data table with price data', () => {
      render(<PriceChart prices={mockPrices} />);
      const table = screen.getByRole('table');
      expect(table).toBeTruthy();
    });

    it('table has correct number of rows', () => {
      const { container } = render(<PriceChart prices={mockPrices} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(mockPrices.length);
    });

    it('table shows color level as text (Bajo/Medio/Alto)', () => {
      render(<PriceChart prices={mockPrices} />);
      expect(screen.getByText('Bajo')).toBeTruthy();
      expect(screen.getByText('Medio')).toBeTruthy();
      expect(screen.getByText('Alto')).toBeTruthy();
    });

    it('table has a sr-only caption', () => {
      const { container } = render(<PriceChart prices={mockPrices} />);
      const caption = container.querySelector('caption');
      expect(caption).toBeTruthy();
      expect(caption?.textContent).toBe('Precios de la electricidad por hora');
    });

    it('table is inside a collapsible details element', () => {
      const { container } = render(<PriceChart prices={mockPrices} />);
      const details = container.querySelector('details');
      expect(details).toBeTruthy();
      const summary = details?.querySelector('summary');
      expect(summary?.textContent).toBe('Ver datos en tabla');
    });

    it('no data table when prices are empty', () => {
      render(<PriceChart prices={[]} />);
      expect(screen.queryByRole('table')).toBeNull();
    });
  });
});
