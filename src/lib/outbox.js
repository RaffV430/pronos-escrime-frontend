// Pronostics en attente d'envoi : saisis sans réseau (ou réseau coupé pendant l'envoi), gardés sur cet
// appareil et renvoyés automatiquement dès que la connexion revient. Le serveur reste seul juge de la
// clôture : un pronostic arrivé après la clôture est refusé et le joueur en est prévenu.
// Seuls les enregistrements de pronostics (identiques si on les renvoie) passent par ici.
import { accountScope } from './fieldCache.js';

export const OUTBOX_EVENT = 'pronos:outbox';
const PREFIX = 'pronos:outbox:v1:';
const MAX_AGE = 24 * 3600000;
const RETRY_MS = 20000;

const scope = () => {
  try {
    return accountScope(localStorage.getItem('token') || '');
  } catch {
    return null;
  }
};
const keyOf = (s) => PREFIX + s;
function load(s = scope()) {
  if (!s) return [];
  try {
    const list = JSON.parse(localStorage.getItem(keyOf(s)) || '[]');
    return Array.isArray(list) ? list.filter((i) => i && Date.now() - i.at < MAX_AGE) : [];
  } catch {
    return [];
  }
}
function save(list, s = scope()) {
  if (!s) return;
  try {
    if (list.length) localStorage.setItem(keyOf(s), JSON.stringify(list));
    else localStorage.removeItem(keyOf(s));
  } catch {
    /* Stockage plein ou indisponible : la saisie reste à l'écran. */
  }
}
const emit = (detail) => window.dispatchEvent(new CustomEvent(OUTBOX_EVENT, { detail }));

// Coupure réseau (pas de réponse du serveur) : à garder pour un nouvel essai.
export const isNetworkError = (error) => Boolean(error) && !error.response && error.code !== 'ERR_CANCELED';
// Refus définitif (409) : la clôture est passée, la saisie ne sera jamais acceptée et n'est pas conservée.
export const isClosedRefusal = (status) => status === 409;
export const CLOSED_REFUSAL_MESSAGE = 'Trop tard : les pronostics sont clos. Ce pronostic n’a pas été pris en compte.';

export function pending() {
  return load();
}
export function isPending(key) {
  return load().some((i) => i.key === key);
}
// Ajoute (ou remplace : la dernière saisie l'emporte) un envoi en attente.
export function queueWrite({ key, method, url, data }) {
  const list = load().filter((i) => i.key !== key);
  list.push({ key, method, url, data, at: Date.now() });
  save(list);
  emit({ key, queued: true, count: list.length });
  schedule();
}
// Une saisie plus récente a été enregistrée directement : l'ancienne attente n'a plus lieu d'être.
export function dropWrite(key) {
  const list = load();
  if (!list.some((i) => i.key === key)) return;
  const next = list.filter((i) => i.key !== key);
  save(next);
  emit({ key, dropped: true, count: next.length });
}

let api = null;
let flushing = false;
let timer = null;
export async function flush() {
  if (!api || flushing) return;
  const s = scope();
  const list = load(s);
  if (!list.length) return;
  flushing = true;
  try {
    for (const item of list) {
      try {
        await api.request({ method: item.method, url: item.url, data: item.data });
        save(
          load(s).filter((i) => !(i.key === item.key && i.at === item.at)),
          s,
        );
        emit({ key: item.key, ok: true, count: load(s).length });
      } catch (error) {
        if (isNetworkError(error)) break; // toujours sans réseau : on réessaiera plus tard
        save(
          load(s).filter((i) => !(i.key === item.key && i.at === item.at)),
          s,
        );
        emit({
          key: item.key,
          ok: false,
          status: error.response?.status,
          error: error.response?.data?.error || 'Pronostic refusé par le serveur.',
          count: load(s).length,
        });
      }
    }
  } finally {
    flushing = false;
    schedule();
  }
}
function schedule() {
  clearTimeout(timer);
  if (load().length) timer = setTimeout(flush, RETRY_MS);
}
// Démarrage : renvoi au retour du réseau, au retour sur l'application, puis toutes les 20 s.
export function startOutbox(client) {
  api = client;
  if (typeof window === 'undefined') return;
  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) flush();
  });
  schedule();
  flush();
}
export function clearOutbox() {
  const s = scope();
  if (s) save([], s);
  emit({ cleared: true, count: 0 });
}
