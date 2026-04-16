import { useState, useEffect } from 'preact/hooks';
import type { Appliance, ApplianceWindow, HourlyPrice } from '../lib/types';
import { calcApplianceWindow } from '../lib/appliances';
import { formatPrice, formatHourIndex } from '../lib/format';

const STORAGE_KEY = 'wattly:custom-appliances';

interface StoredAppliance {
  id: string;
  name: string;
  durationHours: number;
}

interface Props {
  prices: HourlyPrice[];
}

function loadFromStorage(): StoredAppliance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAppliance[];
  } catch {
    return [];
  }
}

function saveToStorage(items: StoredAppliance[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function toAppliance(stored: StoredAppliance): Appliance {
  return {
    id: stored.id,
    name: stored.name,
    icon: '⚡',
    durationHours: stored.durationHours,
    isCustom: true,
  };
}

export default function ApplianceConfigurator({ prices }: Props) {
  const [appliances, setAppliances] = useState<StoredAppliance[]>([]);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [errors, setErrors] = useState<{ name?: string; duration?: string }>({});

  useEffect(() => {
    setAppliances(loadFromStorage());
  }, []);

  function validate(): boolean {
    const errs: { name?: string; duration?: string } = {};
    if (!name.trim()) errs.name = 'El nombre no puede estar vacío';
    const dur = Number(duration);
    if (!duration || isNaN(dur) || dur < 1) errs.duration = 'La duración debe ser al menos 1 hora';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleAdd(e: Event) {
    e.preventDefault();
    if (!validate()) return;

    const newAppliance: StoredAppliance = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      durationHours: Number(duration),
    };

    const updated = [...appliances, newAppliance];
    setAppliances(updated);
    saveToStorage(updated);
    setName('');
    setDuration('');
    setErrors({});
  }

  function handleRemove(id: string) {
    const updated = appliances.filter((a) => a.id !== id);
    setAppliances(updated);
    saveToStorage(updated);
  }

  function getWindow(stored: StoredAppliance): ApplianceWindow | null {
    if (prices.length === 0) return null;
    try {
      return calcApplianceWindow(toAppliance(stored), prices);
    } catch {
      return null;
    }
  }

  return (
    <section aria-label="Configurador de electrodomésticos personalizados">
      <h2 class="mb-4 text-lg font-semibold text-gray-700">Mis electrodomésticos</h2>

      {/* Form */}
      <form onSubmit={handleAdd} noValidate class="mb-6 flex flex-wrap gap-3">
        <div class="min-w-40 flex-1">
          <label htmlFor="appliance-name" class="sr-only">
            Nombre del electrodoméstico
          </label>
          <input
            id="appliance-name"
            type="text"
            placeholder="Nombre (ej. Horno)"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            class={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none ${
              errors.name ? 'border-red-400' : 'border-gray-300'
            }`}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" class="mt-1 text-xs text-red-600" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div class="w-32">
          <label htmlFor="appliance-duration" class="sr-only">
            Duración en horas
          </label>
          <input
            id="appliance-duration"
            type="number"
            min="1"
            max="24"
            placeholder="Horas"
            value={duration}
            onInput={(e) => setDuration((e.target as HTMLInputElement).value)}
            class={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none ${
              errors.duration ? 'border-red-400' : 'border-gray-300'
            }`}
            aria-invalid={!!errors.duration}
            aria-describedby={errors.duration ? 'duration-error' : undefined}
          />
          {errors.duration && (
            <p id="duration-error" class="mt-1 text-xs text-red-600" role="alert">
              {errors.duration}
            </p>
          )}
        </div>

        <button
          type="submit"
          class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Añadir
        </button>
      </form>

      {/* List */}
      {appliances.length === 0 ? (
        <p class="text-sm text-gray-400">
          Añade tus electrodomésticos para ver cuándo es más barato usarlos.
        </p>
      ) : (
        <ul class="space-y-3" aria-label="Lista de electrodomésticos personalizados">
          {appliances.map((stored) => {
            const win = getWindow(stored);
            return (
              <li
                key={stored.id}
                class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p class="font-medium text-gray-800">
                    ⚡ {stored.name}{' '}
                    <span class="text-xs text-gray-400">({stored.durationHours}h)</span>
                  </p>
                  {win ? (
                    <p class="text-price-green mt-0.5 text-sm">
                      Mejor: {formatHourIndex(win.startHour)}–{formatHourIndex(win.endHour)} ·{' '}
                      {formatPrice(win.avgPrice)}
                    </p>
                  ) : (
                    <p class="mt-0.5 text-sm text-gray-400">Sin datos de precios</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(stored.id)}
                  aria-label={`Eliminar ${stored.name}`}
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
