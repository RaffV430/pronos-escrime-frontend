// File de pronostics isolée par compte. Le serveur décide toujours de la clôture et des points.
import { accountScope } from './fieldCache.js';

export const OUTBOX_EVENT = 'pronos:outbox';
const PREFIX = 'pronos:outbox:v1:';
const RECEIPTS = 'pronos:outbox:receipts:v1:';
const MAX_AGE = 24 * 3600000;
const RETRY_MS = 20000;
let sequence = 0;
const locks = new Map();
const scope = () => {
  try {
    return accountScope(localStorage.getItem('token') || '');
  } catch {
    return null;
  }
};
function read(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(list) ? list.filter((i) => i && Date.now() - i.at < MAX_AGE) : [];
  } catch {
    return [];
  }
}
const load = (s = scope()) => (s ? read(PREFIX + s) : []);
function save(list, s = scope(), prefix = PREFIX) {
  if (!s) return false;
  try {
    if (list.length) localStorage.setItem(prefix + s, JSON.stringify(list));
    else localStorage.removeItem(prefix + s);
    return true;
  } catch {
    return false;
  }
}
const emit = (detail) => window.dispatchEvent(new CustomEvent(OUTBOX_EVENT, { detail }));
const revision = (item) => item.revision ?? item.at; // compatibilité des attentes déjà enregistrées
const same = (a, b) => a.key === b.key && revision(a) === revision(b);
const current = (item, s) => load(s).some((i) => same(i, item));
export const isNetworkError = (error) => Boolean(error) && !error.response && error.code !== 'ERR_CANCELED';
export const isRetryable = (error) =>
  isNetworkError(error) || [408, 429].includes(error?.response?.status) || error?.response?.status >= 500;
export const isClosedRefusal = (status) => status === 409;
export const CLOSED_REFUSAL_MESSAGE = 'Trop tard : les pronostics sont clos. Ce pronostic n’a pas été pris en compte.';
export const pending = () => load();
export const isPending = (key) => load().some((i) => i.key === key);

// Les accusés survivent à un démontage/rechargement ; seul l’écran concerné les consomme.
export function takeDeliveries(keys) {
  const s = scope();
  if (!s) return [];
  const rows = read(RECEIPTS + s),
    wanted = new Set(keys);
  const mine = rows.filter((r) => wanted.has(r.key));
  save(
    rows.filter((r) => !wanted.has(r.key)),
    s,
    RECEIPTS,
  );
  return mine;
}
function delivered(detail, s) {
  const rows = read(RECEIPTS + s).filter((r) => r.key !== detail.key);
  save([...rows, { ...detail, at: Date.now() }].slice(-200), s, RECEIPTS);
  if (scope() === s) emit(detail);
}
export function queueWrite({ key, method, url, data }) {
  const s = scope();
  const item = { key, method, url, data, at: Date.now(), revision: `${Date.now()}:${++sequence}:${Math.random()}` };
  const stored = save([...load(s).filter((i) => i.key !== key), item], s);
  if (stored) {
    save(
      read(RECEIPTS + s).filter((r) => r.key !== key),
      s,
      RECEIPTS,
    );
    emit({ key, queued: true, count: load(s).length });
    schedule();
  }
  return stored;
}
export function dropWrite(key, expectedRevision) {
  const s = scope(),
    list = load(s);
  if (s)
    save(
      read(RECEIPTS + s).filter((r) => r.key !== key),
      s,
      RECEIPTS,
    );
  const removes = (i) => i.key === key && (expectedRevision === undefined || revision(i) === expectedRevision);
  if (!list.some(removes)) return;
  save(
    list.filter((i) => !removes(i)),
    s,
  );
  emit({ key, dropped: true, count: load(s).length });
}

// Les envois directs de l’ancienne vue et ceux de la file partagent le même verrou.
// Le plus récent attend la réponse du précédent au lieu de le dépasser sur le réseau.
export function serializeWrite(key, send, s = scope()) {
  const lockKey = `${s}:${key}`;
  const previous = locks.get(lockKey) || Promise.resolve();
  const request = previous
    .catch(() => {})
    .then(() =>
      typeof navigator !== 'undefined' && navigator.locks?.request
        ? navigator.locks.request(`pronos:prediction-write:${lockKey}`, send)
        : send(),
    );
  const tail = request.catch(() => {});
  locks.set(lockKey, tail);
  tail.finally(() => {
    if (locks.get(lockKey) === tail) locks.delete(lockKey);
  });
  return request;
}
let api = null,
  running = null,
  timer = null;
export function flush() {
  if (!api) return Promise.resolve();
  if (running) return running;
  const s = scope();
  if (!s || !load(s).length) return Promise.resolve();
  running = drain(s).finally(() => {
    running = null;
    schedule();
  });
  return running;
}
async function drain(s) {
  const deferred = new Set();
  for (let n = 0; n < 200 && scope() === s; n++) {
    const item = load(s).find((i) => !deferred.has(revision(i)));
    if (!item) break;
    try {
      const sent = await serializeWrite(
        item.key,
        async () => {
          if (scope() !== s || !current(item, s)) return false;
          await api.request({ method: item.method, url: item.url, data: item.data, outboxScope: s });
          return true;
        },
        s,
      );
      if (!sent || !current(item, s)) continue; // un choix plus récent attend déjà son tour
      save(
        load(s).filter((i) => !same(i, item)),
        s,
      );
      delivered({ key: item.key, ok: true, method: item.method, data: item.data, count: load(s).length }, s);
    } catch (error) {
      if (!current(item, s)) continue;
      if (isRetryable(error) || error.code === 'ERR_CANCELED' || error.response?.status === 401) {
        deferred.add(revision(item));
        if (scope() === s)
          emit({ key: item.key, queued: true, retry: true, status: error.response?.status, count: load(s).length });
        if (isNetworkError(error) || error.code === 'ERR_CANCELED' || error.response?.status === 401) break;
        continue;
      }
      save(
        load(s).filter((i) => !same(i, item)),
        s,
      );
      delivered(
        {
          key: item.key,
          ok: false,
          status: error.response?.status,
          error: error.response?.data?.error || 'Pronostic refusé par le serveur.',
          count: load(s).length,
        },
        s,
      );
    }
  }
}
function schedule() {
  clearTimeout(timer);
  if (load().length) timer = setTimeout(flush, RETRY_MS);
}
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
  if (s) {
    save([], s);
    save([], s, RECEIPTS);
  }
  emit({ cleared: true, count: 0 });
}
