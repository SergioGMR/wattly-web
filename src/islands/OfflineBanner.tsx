import { useState, useEffect } from 'preact/hooks';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    setOffline(!navigator.onLine);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      class="bg-amber-500/90 px-4 py-2 text-center text-sm font-medium text-white backdrop-blur-sm dark:bg-amber-500/80"
    >
      Sin conexión — mostrando últimos datos disponibles
    </div>
  );
}
