// Suivi des erreurs (Sentry), chargé à la demande seulement si VITE_SENTRY_DSN
// est défini : sans DSN, aucun code Sentry n'est téléchargé par les joueurs.
let sentry = null;

export function startMonitoring(dsn = import.meta.env.VITE_SENTRY_DSN?.trim()) {
  if (!dsn) return Promise.resolve(null);
  return import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0, sendDefaultPii: false });
    sentry = Sentry;
    return Sentry;
  });
}

export function reportError(error, context) {
  sentry?.captureException(error, context ? { extra: context } : undefined);
}
