import { useEffect, useState } from 'react';
import { pollWhileVisible } from '../lib/polling';
import { rememberReadingPosition } from '../lib/readingPosition';
import { currentEntry, newerVersion } from '../lib/version';

// Vérifie toutes les 5 minutes (et au retour sur l'application) si une nouvelle version est en ligne.
export default function UpdateBanner({ onReload }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;
    const current = currentEntry();
    let stop = () => {};
    const check = () =>
      newerVersion(current)
        .then((newer) => {
          if (!newer) return;
          setAvailable(true);
          stop();
        })
        .catch(() => {});
    stop = pollWhileVisible(check, 5 * 60000);
    return () => stop();
  }, []);
  if (!available) return null;
  return (
    <div className="update-banner" role="status">
      <span>Une nouvelle version de l’application est disponible.</span>
      <button onClick={() => onReload(() => { rememberReadingPosition(); window.location.reload(); })}>Actualiser</button>
    </div>
  );
}
