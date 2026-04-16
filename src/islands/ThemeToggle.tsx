import { useState, useEffect } from 'preact/hooks';

type Theme = 'light' | 'dark' | 'system';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('wattly:theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* empty */
  }
  return 'system';
}

function resolveEffective(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const isDark = resolveEffective(theme);
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('wattly:theme', theme);
  window.dispatchEvent(new CustomEvent('wattly:theme-change'));
}

const SunIcon = () => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    class="h-4 w-4"
  >
    <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
  </svg>
);

const MoonIcon = () => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    class="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 1110.07 1.79a.75.75 0 01-.615.213z"
      clipRule="evenodd"
    />
  </svg>
);

const MonitorIcon = () => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    class="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v8.5A2.25 2.25 0 0115.75 15h-3.105a3.501 3.501 0 001.1 1.677A.75.75 0 0113.26 18H6.74a.75.75 0 01-.484-1.323A3.501 3.501 0 007.355 15H4.25A2.25 2.25 0 012 12.75v-8.5zm1.5 0a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-7.5z"
      clipRule="evenodd"
    />
  </svg>
);

const options: { value: Theme; label: string; Icon: () => preact.JSX.Element }[] = [
  { value: 'light', label: 'Modo claro', Icon: SunIcon },
  { value: 'dark', label: 'Modo oscuro', Icon: MoonIcon },
  { value: 'system', label: 'Sistema', Icon: MonitorIcon },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const mql = matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') applyTheme('system');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  function handleClick(value: Theme) {
    setTheme(value);
    applyTheme(value);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const values = options.map((o) => o.value);
    const currentIndex = values.indexOf(theme);
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % values.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + values.length) % values.length;
    }

    if (nextIndex !== null) {
      handleClick(values[nextIndex]);
      const btn = document.querySelector<HTMLElement>(
        `[role="radio"][aria-label="${options[nextIndex].label}"]`
      );
      btn?.focus();
    }
  }

  return (
    <div
      class="flex gap-1 rounded-lg bg-black/5 p-1 dark:bg-white/5"
      role="radiogroup"
      aria-label="Seleccionar tema"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          tabIndex={theme === value ? 0 : -1}
          onClick={() => handleClick(value)}
          class={`rounded-md p-2 transition-colors ${
            theme === value
              ? 'bg-white/80 text-gray-900 shadow-sm backdrop-blur-sm dark:bg-white/10 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
