import { reducedData, CACHE_EVENT } from './fieldCache';
import { useEffect, useState } from 'react';

// Rafraîchissement périodique suspendu quand l'application est en arrière-plan (batterie et données
// mobiles pendant une longue journée de compétition), avec une relecture immédiate au retour.
export function pollWhileVisible(fn, ms, { network = true } = {}) {
  let timer = null;
  const hidden = () => typeof document !== 'undefined' && document.hidden;
  const start = () => {
    if (!timer && !hidden()) timer = setInterval(fn, network && reducedData() ? Math.max(ms, 60000) : ms);
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const onVisibility = () => {
    if (hidden()) stop();
    else {
      fn();
      start();
    }
  };
  window.addEventListener('online', onVisibility);
  const changed = (event) => {
    if (network && event.detail?.path && !event.detail.offline && !event.detail.error && !hidden()) fn();
  };
  window.addEventListener(CACHE_EVENT, changed);
  const mode = () => {
    stop();
    start();
  };
  window.addEventListener('pronos:data-mode', mode);
  start();
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    stop();
    window.removeEventListener(CACHE_EVENT, changed);
    window.removeEventListener('pronos:data-mode', mode);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onVisibility);
  };
}

// Heure courante rafraîchie localement : seul le composant qui l'utilise se redessine,
// pas toute l'application (à la seconde pour un compte à rebours, moins souvent ailleurs).
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => pollWhileVisible(() => setNow(Date.now()), ms, { network: false }), [ms]);
  return now;
}
