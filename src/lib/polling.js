import { REDUCED_RESULT_REFRESH_MS } from './resultSync.js';
import { reducedData, CACHE_EVENT } from './fieldCache';
import { useEffect, useState } from 'react';

// Rafraîchissement périodique suspendu quand l'application est en arrière-plan (batterie et données
// mobiles pendant une longue journée de compétition), avec une relecture immédiate au retour.
export function pollWhileVisible(fn, ms, { network = true, follow = network } = {}) {
  let timer = null;
  let burst = null;
  const hidden = () => typeof document !== 'undefined' && document.hidden;
  const start = () => {
    if (!timer && !hidden()) timer = setInterval(fn, network && reducedData() ? Math.max(ms, REDUCED_RESULT_REFRESH_MS) : ms);
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
  // Relecture après un changement de données : regroupée (plusieurs signaux rapprochés = une seule relecture)
  // et réservée aux écrans qui suivent les résultats.
  const changed = (event) => {
    if (
      follow &&
      !burst &&
      (event.detail?.path || event.detail?.resultsChanged) &&
      !event.detail.offline &&
      !event.detail.error &&
      !hidden()
    )
      burst = setTimeout(() => {
        burst = null;
        fn();
      }, 300);
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
    clearTimeout(burst);
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
