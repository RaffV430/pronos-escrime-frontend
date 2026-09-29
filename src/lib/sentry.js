// Seules les fonctions utilisées sont importées : le paquet Sentry chargé reste léger
// (sans l'enregistrement de session « Replay »).
export { init, captureException } from '@sentry/react';
