import { lowConnection } from './connectionQuality.js';
import { resultRefreshInterval } from './resultSync.js';
// Only consultation data, scoped to the signed-in account. Never queue writes.
export const CACHE_EVENT = 'pronos:consultation-updated';
const PREFIX = 'pronos:consultation:v1:';
const MAX_AGE = 24 * 60 * 60 * 1000;
const LIMIT = 2 * 1024 * 1024;
export function accountScope(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.userId || !payload.exp || payload.exp * 1000 <= Date.now()) return null;
    return String(payload.userId);
  } catch {
    return null;
  }
}
export function cachePath(config) {
  const url = new URL(config.url, 'https://cache.invalid');
  for (const [key, value] of Object.entries(config.params || {}))
    if (value != null) url.searchParams.set(key, String(value));
  url.searchParams.sort();
  return url.pathname + url.search;
}
export function cacheLifetime(path, reduced = false) {
  if (/^\/auth\/me$/.test(path)) return 0;
  if (/^\/(matches|pools)(\?|$)/.test(path) || /^\/podium\/competitions\/\d+(\?|$)/.test(path))
    return resultRefreshInterval(reduced);
  if (/^\/me\/fencers(\?|$)/.test(path)) return 60000;
  if (/^\/(tournaments|public\/tournaments|clubs)(\?|$)/.test(path)) return 300000;
  return null;
}
export function createFieldCache(storage, now = Date.now) {
  const key = (scope, path) => PREFIX + scope + ':' + path;
  const keys = () =>
    Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => k?.startsWith(PREFIX));
  function clear(scope) {
    try {
      for (const k of keys()) if (!scope || k.startsWith(PREFIX + scope + ':')) storage.removeItem(k);
    } catch {
      /* Unavailable storage. */
    }
  }
  function read(scope, path) {
    try {
      const value = JSON.parse(storage.getItem(key(scope, path)));
      if (!value || now() - value.at > MAX_AGE) {
        storage.removeItem(key(scope, path));
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
  function write(scope, path, data, etag) {
    try {
      let size = 0;
      for (const k of keys()) {
        const raw = storage.getItem(k);
        const row = JSON.parse(raw);
        if (now() - row.at > MAX_AGE) storage.removeItem(k);
        else size += raw.length * 2;
      }
      const raw = JSON.stringify({ at: now(), data, etag });
      if (raw.length * 2 > LIMIT) return;
      if (size + raw.length * 2 > LIMIT) clear();
      storage.setItem(key(scope, path), raw);
    } catch {
      /* Full or disabled storage must never break the application. */
    }
  }
  function invalidateCompetition(scope, id) {
    try {
      for (const k of keys()) {
        if (!k.startsWith(PREFIX + scope + ':')) continue;
        const path = k.slice((PREFIX + scope + ':').length);
        const url = new URL(path, 'https://cache.invalid');
        if (
          (['/matches', '/pools'].includes(url.pathname) && url.searchParams.get('competitionId') === String(id)) ||
          /^\/podium\/competitions\/\d+$/.test(url.pathname)
        ) {
          const row = JSON.parse(storage.getItem(k));
          storage.setItem(k, JSON.stringify({ ...row, invalidated: true }));
        }
      }
    } catch {
      /* Keep the last readable copy when storage is unavailable. */
    }
  }
  return { read, write, clear, invalidateCompetition };
}
// Mode connexion faible : choix du joueur, ou détection automatique (voir connectionQuality.js).
export function reducedData() {
  return lowConnection();
}
