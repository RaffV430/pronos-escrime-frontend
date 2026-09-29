// Suivi des erreurs (Sentry), chargé à la demande seulement si VITE_SENTRY_DSN
// est défini : sans DSN, aucun code Sentry n'est téléchargé par les joueurs.
let sentry = null;

export function startMonitoring(dsn = import.meta.env.VITE_SENTRY_DSN?.trim()) {
  if (!dsn) return Promise.resolve(null);
  // Chargé une fois la page affichée (le suivi des erreurs ne doit pas retarder l'écran des matchs).
  const idle = (fn) =>
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(fn, { timeout: 4000 })
      : setTimeout(fn, 1500);
  return new Promise((resolve) => idle(resolve))
    .then(() => import('./sentry.js'))
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0,
        sendDefaultPii: false,
        integrations: (defaults) => defaults.filter((i) => !/Replay/.test(i.name)),
      });
      sentry = Sentry;
      return Sentry;
    });
}

export function reportError(error, context) {
  sentry?.captureException(error, context ? { extra: context } : undefined);
}
