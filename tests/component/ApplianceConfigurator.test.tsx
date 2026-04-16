import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import ApplianceConfigurator from '../../src/islands/ApplianceConfigurator';
import type { HourlyPrice } from '../../src/lib/types';

const mockPrices: HourlyPrice[] = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00-${String(i + 1).padStart(2, '0')}:00`,
  price: 0.05 + i * 0.01,
  color: 'green' as const,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function fillAndSubmit(name: string, hours: string) {
  const nameInput = screen.getByPlaceholderText(/Nombre/i);
  const durationInput = screen.getByPlaceholderText(/Horas/i);
  const submitButton = screen.getByRole('button', { name: /Añadir/i });

  fireEvent.input(nameInput, { target: { value: name } });
  fireEvent.input(durationInput, { target: { value: hours } });
  fireEvent.click(submitButton);
}

describe('ApplianceConfigurator', () => {
  it('shows empty state when no appliances', () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    expect(screen.getByText(/Añade tus electrodomésticos/)).toBeTruthy();
  });

  it('adds an appliance when form is filled and submitted', async () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    fillAndSubmit('Horno', '1');
    await waitFor(() => {
      expect(screen.getByText(/Horno/)).toBeTruthy();
    });
  });

  it('removes an appliance from the list', async () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    fillAndSubmit('Horno', '1');

    await waitFor(() => expect(screen.getByText(/Horno/)).toBeTruthy());

    const removeBtn = screen.getByRole('button', { name: /Eliminar Horno/ });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Horno/)).toBeNull();
    });
  });

  it('reads existing appliances from localStorage on mount', () => {
    localStorageMock.setItem(
      'wattly:custom-appliances',
      JSON.stringify([{ id: 'test-1', name: 'Microondas', durationHours: 1 }])
    );
    render(<ApplianceConfigurator prices={mockPrices} />);
    expect(screen.getByText(/Microondas/)).toBeTruthy();
  });

  it('writes to localStorage when adding an appliance', async () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    fillAndSubmit('Lavadora', '2');

    await waitFor(() => {
      const stored = localStorageMock.getItem('wattly:custom-appliances');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed[0].name).toBe('Lavadora');
    });
  });

  it('writes to localStorage when removing an appliance', async () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    fillAndSubmit('Secadora', '3');

    await waitFor(() => expect(screen.getByText(/Secadora/)).toBeTruthy());

    const removeBtn = screen.getByRole('button', { name: /Eliminar Secadora/ });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      const stored = localStorageMock.getItem('wattly:custom-appliances');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });
  });

  it('shows validation error for empty name', () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    fillAndSubmit('', '2');
    expect(screen.getByText(/nombre no puede estar vacío/i)).toBeTruthy();
  });

  it('shows validation error for duration 0', () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    fillAndSubmit('Test', '0');
    expect(screen.getByText(/al menos 1 hora/i)).toBeTruthy();
  });

  it('shows validation error for negative duration', () => {
    render(<ApplianceConfigurator prices={mockPrices} />);
    fillAndSubmit('Test', '-1');
    expect(screen.getByText(/al menos 1 hora/i)).toBeTruthy();
  });
});
