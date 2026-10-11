import { useEffect } from 'react';
import API, { consultationCache } from '../api';
import { accountScope, CACHE_EVENT, reducedData } from './fieldCache';
import { nextResultCheck, resultRevision } from './resultSync';

// One watcher per event, shared between the workspace and followed-fencer cards.
const watchers = new Map();
function watch(id) {
  if (watchers.has(id)) {
    watchers.get(id).count++;
    return () => release(id);
  }
  const row = { count: 1, timer: null, revision: null, busy: false, controller: new AbortController() };
  watchers.set(id, row);
  const read = async () => {
    clearTimeout(row.timer);
    if (document.hidden || row.busy || row.controller.signal.aborted) return;
    row.busy = true;
    let data;
    try {
      const response = await API.get(`/matches/freshness/${id}`, { signal: row.controller.signal });
      if (row.controller.signal.aborted) return;
      data = response.data;
      const revision = resultRevision(data);
      if (revision && revision !== row.revision) {
        row.revision = revision;
        const scope = accountScope(localStorage.getItem('token'));
        if (scope) consultationCache.invalidateCompetition(scope, id);
        window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail: { resultsChanged: true, competitionId: id } }));
      }
    } catch {
      /* Preserve results and user interaction when a check fails. */
    } finally {
      row.busy = false;
      if (!row.controller.signal.aborted && !document.hidden)
        row.timer = setTimeout(read, nextResultCheck(data, Date.now(), reducedData()));
    }
  };
  row.stop = () => {
    row.controller.abort();
    clearTimeout(row.timer);
    document.removeEventListener('visibilitychange', read);
    window.removeEventListener('online', read);
    window.removeEventListener('pronos:data-mode', read);
  };
  document.addEventListener('visibilitychange', read);
  window.addEventListener('online', read);
  window.addEventListener('pronos:data-mode', read);
  read();
  return () => release(id);
}
function release(id) {
  const row = watchers.get(id);
  if (row && --row.count === 0) {
    row.stop();
    watchers.delete(id);
  }
}
export function useResultSync(ids) {
  const key = [...new Set(ids.filter(Boolean))].sort().join(',');
  useEffect(() => {
    const stops = key ? key.split(',').map(watch) : [];
    return () => stops.forEach((stop) => stop());
  }, [key]);
}
