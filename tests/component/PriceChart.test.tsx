import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import PriceChart, { calculateYScale } from '../../src/islands/PriceChart';
import type { HourlyPrice } from '../../src/lib/types';

const mockPrices: HourlyPrice[] = [
  { hour: '00:00-01:00', price: 0.05, color: 'green' },
  { hour: '01:00-02:00', price: 0.08, color: 'orange' },
  { hour: '02:00-03:00', price: 0.15, color: 'red' },
];

describe('PriceChart', () => {
  it('renders an svg element', () => {
    const { container } = render(<PriceChart prices={mockPrices} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders with correct aria-label on svg', () => {
    render(<PriceChart prices={mockPrices} />);
    const svg = screen.getByRole('img', { name: 'Gráfico de precios de la electricidad por hora' });
    expect(svg).toBeTruthy();
  });

  it('renders svg with viewBox 0 0 800 240', () => {
    const { container } = render(<PriceChart prices={mockPrices} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 800 240');
  });

  it('renders SVG titles on bars for accessibility', () => {
    const { container } = render(<PriceChart prices={mockPrices} />);
    const titles = container.querySelectorAll('title');
    expect(titles.length).toBe(mockPrices.length);
    expect(titles[0].textContent).toContain('00:00h');
  });

  it('renders Y-axis grid and tick labels in €/kWh', () => {
    render(<PriceChart prices={mockPrices} />);
    expect(screen.getByText('0,00 €/kWh')).toBeTruthy();
  });

  it('shows tooltip on hover', () => {
    const { container } = render(<PriceChart prices={mockPrices} />);
    const bar = container.querySelector('g[role="graphics-symbol"]');
    expect(bar).toBeTruthy();
    if (bar) {
      fireEvent.mouseEnter(bar);
      expect(screen.getAllByText(/00:00h/).length).toBeGreaterThanOrEqual(1);
    }
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

  describe('negative prices handling', () => {
    const mockPricesWithNegative: HourlyPrice[] = [
      { hour: '00:00-01:00', price: 0.1, color: 'orange' },
      { hour: '01:00-02:00', price: -0.015, color: 'green' },
      { hour: '02:00-03:00', price: 0.2, color: 'red' },
    ];

    it('renders chart with negative prices without crashing', () => {
      const { container } = render(<PriceChart prices={mockPricesWithNegative} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('calculates negative yMin, yZero and includes negative ticks', () => {
      const { yMin, yZero, ticks } = calculateYScale(mockPricesWithNegative, 200, 180);
      expect(yMin).toBeLessThan(0);
      expect(yZero).toBeLessThan(200);
      expect(ticks.some((t) => t < 0)).toBe(true);
      expect(ticks.includes(0)).toBe(true);
    });

    it('renders negative Y-axis tick and zero baseline', () => {
      render(<PriceChart prices={mockPricesWithNegative} />);
      expect(screen.getByText('0,00 €/kWh')).toBeTruthy();
      const negativeTick = screen.queryByText(/-\d+,\d{2} €\/kWh/);
      expect(negativeTick).toBeTruthy();
    });

    it('renders bars for negative prices starting at yZero with min height 3px', () => {
      const { container } = render(<PriceChart prices={mockPricesWithNegative} />);
      const bars = container.querySelectorAll('g[role="graphics-symbol"] rect[rx="3"]');
      expect(bars.length).toBe(3);

      const negBar = bars[1];
      const height = Number(negBar.getAttribute('height'));
      const y = Number(negBar.getAttribute('y'));
      expect(height).toBeGreaterThanOrEqual(3);

      const { yZero } = calculateYScale(mockPricesWithNegative, 200, 180);
      expect(y).toBeCloseTo(yZero, 1);
    });

    it('displays tooltip with negative price on hover', () => {
      const { container } = render(<PriceChart prices={mockPricesWithNegative} />);
      const symbols = container.querySelectorAll('g[role="graphics-symbol"]');
      const negSymbol = symbols[1];
      fireEvent.mouseEnter(negSymbol);
      expect(screen.getAllByText(/-0,015 €\/kWh/).length).toBeGreaterThanOrEqual(2);
    });

    it('displays negative prices in data table', () => {
      render(<PriceChart prices={mockPricesWithNegative} />);
      expect(screen.getByText('-0,015 €/kWh')).toBeTruthy();
    });
  });
});
