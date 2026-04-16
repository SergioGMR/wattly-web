import { useState, useEffect } from 'preact/hooks';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      setDismissed(false);
    };
    const goOnline = () => setOffline(false);

    setOffline(!navigator.onLine);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div
      role="alert"
      class="flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-center text-sm font-medium text-white backdrop-blur-sm dark:bg-amber-500/80"
    >
      <span>Sin conexión — mostrando últimos datos disponibles</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Cerrar aviso"
        class="ml-2 rounded p-1 transition-colors hover:bg-white/20"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
