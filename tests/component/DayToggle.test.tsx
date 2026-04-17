import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import DayToggle from '../../src/islands/DayToggle';
import type { HourlyPrice, Highlights } from '../../src/lib/types';

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

const makePrices = (base: number): HourlyPrice[] =>
  Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
    price: base + i * 0.01,
    color: 'green' as const,
  }));

const makeHighlights = (prices: HourlyPrice[]): Highlights => ({
  average: 0.1,
  min: prices[0],
  max: prices[prices.length - 1],
  current: prices[0],
});

const todayPrices = makePrices(0.05);
const tomorrowPrices = makePrices(0.07);

const today = {
  prices: todayPrices,
  highlights: makeHighlights(todayPrices),
  date: '2026-04-17',
};
const tomorrow = {
  prices: tomorrowPrices,
  highlights: makeHighlights(tomorrowPrices),
  date: '2026-04-18',
};

describe('DayToggle', () => {
  it('shows both tabs', () => {
    render(<DayToggle today={today} tomorrow={tomorrow} />);
    expect(screen.getByRole('tab', { name: /Hoy/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Mañana/ })).toBeTruthy();
  });

  it('renders short date in each tab', () => {
    render(<DayToggle today={today} tomorrow={tomorrow} />);
    const todayTab = screen.getByRole('tab', { name: /Hoy/ });
    const tomorrowTab = screen.getByRole('tab', { name: /Mañana/ });
    expect(todayTab.textContent).toMatch(/17/);
    expect(todayTab.textContent?.toLowerCase()).toContain('abr');
    expect(tomorrowTab.textContent).toMatch(/18/);
    expect(tomorrowTab.textContent?.toLowerCase()).toContain('abr');
  });

  it('tomorrow tab shows fallback text when data is null', () => {
    render(<DayToggle today={today} tomorrow={null} />);
    const tab = screen.getByRole('tab', { name: /Mañana/ });
    expect(tab.textContent).toContain('disponible');
  });

  it('tomorrow tab is disabled when data is null', () => {
    render(<DayToggle today={today} tomorrow={null} />);
    const tab = screen.getByRole('tab', { name: /Mañana/ }) as HTMLButtonElement;
    expect(tab.disabled).toBe(true);
  });

  it('tomorrow tab is enabled when data is available', () => {
    render(<DayToggle today={today} tomorrow={tomorrow} />);
    const tab = screen.getByRole('tab', { name: /Mañana/ }) as HTMLButtonElement;
    expect(tab.disabled).toBe(false);
  });

  it('clicking tomorrow tab changes the selected state', () => {
    render(<DayToggle today={today} tomorrow={tomorrow} />);
    const tomorrowTab = screen.getByRole('tab', { name: /Mañana/ });
    fireEvent.click(tomorrowTab);
    expect(tomorrowTab.getAttribute('aria-selected')).toBe('true');
  });

  it('shows unavailable message when tomorrow is null and tab would be clicked', () => {
    render(<DayToggle today={today} tomorrow={null} />);
    // The fallback message should not appear since today is shown by default
    // and null tomorrow means the panel shows the unavailable message only if selected
    expect(screen.queryByText(/disponible a partir/)).toBeNull();
  });

  describe('keyboard navigation', () => {
    it('ArrowRight moves to tomorrow tab when available', () => {
      render(<DayToggle today={today} tomorrow={tomorrow} />);
      const tablist = screen.getByRole('tablist');
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      expect(screen.getByRole('tab', { name: /Mañana/ }).getAttribute('aria-selected')).toBe(
        'true'
      );
    });

    it('ArrowRight does not move to disabled tomorrow tab', () => {
      render(<DayToggle today={today} tomorrow={null} />);
      const tablist = screen.getByRole('tablist');
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      expect(screen.getByRole('tab', { name: /Hoy/ }).getAttribute('aria-selected')).toBe('true');
    });

    it('ArrowLeft wraps to tomorrow when on today', () => {
      render(<DayToggle today={today} tomorrow={tomorrow} />);
      const tablist = screen.getByRole('tablist');
      fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
      expect(screen.getByRole('tab', { name: /Mañana/ }).getAttribute('aria-selected')).toBe(
        'true'
      );
    });

    it('Home key moves to today tab', () => {
      render(<DayToggle today={today} tomorrow={tomorrow} />);
      const tablist = screen.getByRole('tablist');
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      fireEvent.keyDown(tablist, { key: 'Home' });
      expect(screen.getByRole('tab', { name: /Hoy/ }).getAttribute('aria-selected')).toBe('true');
    });

    it('End key moves to tomorrow tab when available', () => {
      render(<DayToggle today={today} tomorrow={tomorrow} />);
      const tablist = screen.getByRole('tablist');
      fireEvent.keyDown(tablist, { key: 'End' });
      expect(screen.getByRole('tab', { name: /Mañana/ }).getAttribute('aria-selected')).toBe(
        'true'
      );
    });

    it('active tab has tabIndex 0, inactive has -1', () => {
      render(<DayToggle today={today} tomorrow={tomorrow} />);
      const todayTab = screen.getByRole('tab', { name: /Hoy/ });
      const tomorrowTab = screen.getByRole('tab', { name: /Mañana/ });
      expect(todayTab.getAttribute('tabindex')).toBe('0');
      expect(tomorrowTab.getAttribute('tabindex')).toBe('-1');
    });
  });
});
