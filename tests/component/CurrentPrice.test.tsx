import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import type { HourlyPrice } from '../../src/lib/types';

vi.mock('../../src/lib/format', async () => {
  const actual =
    await vi.importActual<typeof import('../../src/lib/format')>('../../src/lib/format');
  return {
    ...actual,
    getDisplayHour: vi.fn(() => ({ hourStr: '18:00', label: '', lookupIndex: 18 })),
  };
});

import CurrentPrice from '../../src/islands/CurrentPrice';
import * as format from '../../src/lib/format';

const hourly: HourlyPrice[] = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
  price: 0.05 + i * 0.01,
  color: (i === 18 ? 'red' : 'green') as HourlyPrice['color'],
}));

const fallback: HourlyPrice = { hour: '14:00-15:00', price: 0.08, color: 'orange' };

describe('CurrentPrice', () => {
  beforeEach(() => {
    vi.mocked(format.getDisplayHour).mockReturnValue({
      hourStr: '18:00',
      label: '',
      lookupIndex: 18,
    });
  });

  it('picks hourly entry matching peninsular index after mount', async () => {
    render(<CurrentPrice hourly={hourly} fallbackCurrent={fallback} dateShort="17 abr" />);
    const header = await screen.findByText(/Precio ahora/);
    expect(header.textContent).toContain('18:00h');
    expect(header.textContent).toContain('17 abr');
  });

  it('renders price from matching hourly entry (not fallback) post-mount', async () => {
    render(<CurrentPrice hourly={hourly} fallbackCurrent={fallback} dateShort="17 abr" />);
    // hourly[18].price = 0.05 + 18 * 0.01 = 0.23
    expect(await screen.findByText(/0,230/)).toBeTruthy();
  });

  it('applies category color class from matched entry', async () => {
    const { container } = render(
      <CurrentPrice hourly={hourly} fallbackCurrent={fallback} dateShort="17 abr" />
    );
    await screen.findByText(/Precio ahora/);
    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-price-red-bg');
  });

  it('Canarias user sees their local hour without extra label', async () => {
    vi.mocked(format.getDisplayHour).mockReturnValue({
      hourStr: '17:00',
      label: '',
      lookupIndex: 17,
    });
    render(<CurrentPrice hourly={hourly} fallbackCurrent={fallback} dateShort="17 abr" />);
    const header = await screen.findByText(/Precio ahora/);
    expect(header.textContent).toContain('17:00h');
    expect(header.textContent).not.toContain('hora Canarias');
    expect(header.textContent).not.toContain('hora peninsular');
  });

  it('foreign user sees peninsular label', async () => {
    vi.mocked(format.getDisplayHour).mockReturnValue({
      hourStr: '18:00',
      label: 'hora peninsular',
      lookupIndex: 18,
    });
    render(<CurrentPrice hourly={hourly} fallbackCurrent={fallback} dateShort="17 abr" />);
    const header = await screen.findByText(/Precio ahora/);
    expect(header.textContent).toContain('18:00h hora peninsular');
  });

  it('falls back to fallbackCurrent when hourly[] has no matching hour', async () => {
    vi.mocked(format.getDisplayHour).mockReturnValue({
      hourStr: '18:00',
      label: '',
      lookupIndex: 99,
    });
    render(<CurrentPrice hourly={hourly} fallbackCurrent={fallback} dateShort="17 abr" />);
    await screen.findByText(/Precio ahora/);
    expect(await screen.findByText(/0,080/)).toBeTruthy();
  });
});
