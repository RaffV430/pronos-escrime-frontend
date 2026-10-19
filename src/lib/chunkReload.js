// Après une mise en ligne, un onglet resté ouvert peut réclamer un morceau de l'ancienne version qui
// n'existe plus : la section ne s'affiche pas. On recharge alors la page une seule fois (pas de boucle).
const KEY = 'pronos:chunk-reload';
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch dynamically|Unable to preload CSS|text\/html.*module script/i;

export const isChunkError = (error) => CHUNK_ERROR.test(String(error?.message || error || ''));

export function reloadOnceForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(KEY));
    if (last && Date.now() - last < 60000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* Sans stockage : on recharge quand même, une seule fois par erreur affichée. */
  }
  window.location.reload();
  return true;
}

export function watchChunkErrors() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForNewVersion()) event.preventDefault();
  });
}
