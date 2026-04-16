import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import ThemeToggle from '../../src/islands/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders three radio buttons (light, dark, system)', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: 'Modo claro' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Modo oscuro' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeTruthy();
  });

  it('defaults to system when no stored preference', () => {
    render(<ThemeToggle />);
    const system = screen.getByRole('radio', { name: 'Sistema' });
    expect(system.getAttribute('aria-checked')).toBe('true');
  });

  it('clicking dark mode adds .dark class to html', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Modo oscuro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('clicking light mode removes .dark class from html', () => {
    document.documentElement.classList.add('dark');
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Modo claro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('saves theme preference to localStorage', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Modo oscuro' }));
    expect(localStorage.getItem('wattly:theme')).toBe('dark');
  });

  it('reads stored preference on mount', () => {
    localStorage.setItem('wattly:theme', 'dark');
    render(<ThemeToggle />);
    const dark = screen.getByRole('radio', { name: 'Modo oscuro' });
    expect(dark.getAttribute('aria-checked')).toBe('true');
  });

  it('dispatches wattly:theme-change custom event on click', () => {
    const handler = vi.fn();
    window.addEventListener('wattly:theme-change', handler);

    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Modo oscuro' }));
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener('wattly:theme-change', handler);
  });

  describe('keyboard navigation', () => {
    it('ArrowRight cycles from system to light', () => {
      render(<ThemeToggle />);
      const radiogroup = screen.getByRole('radiogroup');
      fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });
      expect(screen.getByRole('radio', { name: 'Modo claro' }).getAttribute('aria-checked')).toBe(
        'true'
      );
    });

    it('ArrowLeft cycles from system to dark', () => {
      render(<ThemeToggle />);
      const radiogroup = screen.getByRole('radiogroup');
      fireEvent.keyDown(radiogroup, { key: 'ArrowLeft' });
      expect(screen.getByRole('radio', { name: 'Modo oscuro' }).getAttribute('aria-checked')).toBe(
        'true'
      );
    });

    it('ArrowDown cycles forward', () => {
      render(<ThemeToggle />);
      const radiogroup = screen.getByRole('radiogroup');
      fireEvent.keyDown(radiogroup, { key: 'ArrowDown' });
      expect(screen.getByRole('radio', { name: 'Modo claro' }).getAttribute('aria-checked')).toBe(
        'true'
      );
    });

    it('ArrowUp cycles backward', () => {
      render(<ThemeToggle />);
      const radiogroup = screen.getByRole('radiogroup');
      fireEvent.keyDown(radiogroup, { key: 'ArrowUp' });
      expect(screen.getByRole('radio', { name: 'Modo oscuro' }).getAttribute('aria-checked')).toBe(
        'true'
      );
    });

    it('selected radio has tabIndex 0, others have -1', () => {
      render(<ThemeToggle />);
      const system = screen.getByRole('radio', { name: 'Sistema' });
      const light = screen.getByRole('radio', { name: 'Modo claro' });
      const dark = screen.getByRole('radio', { name: 'Modo oscuro' });
      expect(system.getAttribute('tabindex')).toBe('0');
      expect(light.getAttribute('tabindex')).toBe('-1');
      expect(dark.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('SVG accessibility', () => {
    it('all SVG icons have aria-hidden="true"', () => {
      const { container } = render(<ThemeToggle />);
      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });
});
