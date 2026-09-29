import { useEffect, useState } from 'react';

// Rafraîchissement périodique suspendu quand l'application est en arrière-plan (batterie et données
// mobiles pendant une longue journée de compétition), avec une relecture immédiate au retour.
export function pollWhileVisible(fn, ms) {
  let timer = null;
  const hidden = () => typeof document !== 'undefined' && document.hidden;
  const start = () => {
    if (!timer && !hidden()) timer = setInterval(fn, ms);
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
  start();
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

// Heure courante rafraîchie localement : seul le composant qui l'utilise se redessine,
// pas toute l'application (à la seconde pour un compte à rebours, moins souvent ailleurs).
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => pollWhileVisible(() => setNow(Date.now()), ms), [ms]);
  return now;
}
