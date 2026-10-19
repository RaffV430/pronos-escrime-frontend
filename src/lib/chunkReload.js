// Une relance automatique exige un stockage fiable et aucune saisie en cours.
const KEY = 'pronos:chunk-reload';
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch dynamically|Unable to preload CSS|text\/html.*module script/i;
let blocked = false;
let attempted = false;
let interruptedDraft = false;
export const isChunkError = (error) => CHUNK_ERROR.test(String(error?.message || error || ''));
export function setReloadBlocked(value) {
  blocked = Boolean(value);
}
export function reloadOnceForNewVersion() {
  if (blocked) {
    interruptedDraft = true;
    return false;
  }
  if (interruptedDraft || attempted) return false;
  try {
    // Le marqueur reste pour toute la session : pas de boucle après une minute hors ligne.
    if (sessionStorage.getItem(KEY)) return false;
    sessionStorage.setItem(KEY, '1');
    if (sessionStorage.getItem(KEY) !== '1') return false;
  } catch {
    return false;
  }
  attempted = true;
  window.location.reload();
  return true;
}
export function requestPageReload() {
  if (
    (blocked || interruptedDraft) &&
    !window.confirm('Des pronostics ne sont pas enregistrés. Recharger abandonnera cette saisie. Continuer ?')
  )
    return false;
  window.location.reload();
  return true;
}
export function watchChunkErrors() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForNewVersion()) event.preventDefault();
  });
}
