import { useEffect, useState } from 'react';
import { CACHE_EVENT, reducedData } from '../lib/fieldCache';
export default function ConnectionStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [checkedAt, setCheckedAt] = useState(null);
  const [light, setLight] = useState(reducedData);
  useEffect(() => {
    const update = (event) => {
      if (event.detail?.offline) {
        setOffline(true);
        setCheckedAt(event.detail.checkedAt);
      } else if (event.detail?.checkedAt) {
        setOffline(false);
        setCheckedAt(event.detail.checkedAt);
      }
    };
    const online = () => setOffline(!navigator.onLine);
    const mode = () => setLight(reducedData());
    window.addEventListener(CACHE_EVENT, update);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    window.addEventListener('pronos:data-mode', mode);
    return () => {
      window.removeEventListener(CACHE_EVENT, update);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
      window.removeEventListener('pronos:data-mode', mode);
    };
  }, []);
  if (!offline && !light) return null;
  return (
    <p className="connection-status" role="status">
      {offline
        ? `Connexion indisponible · données conservées${checkedAt ? `, reçues à ${new Date(checkedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}. Les enregistrements nécessitent une connexion.`
        : 'Mode connexion faible · actualisation espacée, données conservées sur cet appareil.'}
    </p>
  );
}
