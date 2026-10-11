import { useEffect, useState } from 'react';
import API, { consultationCache } from '../api';
import { accountScope, CACHE_EVENT, reducedData } from './fieldCache';
import { nextResultCheck, resultRevision, FRESHNESS_EVENT } from './resultSync';

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
    let failed = false;
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
      failed = !row.controller.signal.aborted;
    } finally {
      if (!row.controller.signal.aborted) {
        row.last = { data: data ?? row.last?.data ?? null, failed };
        window.dispatchEvent(new CustomEvent(FRESHNESS_EVENT, { detail: { competitionId: id, ...row.last } }));
      }
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

// Dernier contrôle connu d'une épreuve, lu sur le veilleur partagé (aucune requête en plus).
export function useFreshness(competitionId) {
  const id = competitionId ? String(competitionId) : '';
  useResultSync([id]);
  const [state, setState] = useState(() => watchers.get(id)?.last || { data: null, failed: false });
  useEffect(() => {
    setState(watchers.get(id)?.last || { data: null, failed: false });
    const on = (event) => {
      if (String(event.detail?.competitionId) === id) setState({ data: event.detail.data, failed: event.detail.failed });
    };
    window.addEventListener(FRESHNESS_EVENT, on);
    return () => window.removeEventListener(FRESHNESS_EVENT, on);
  }, [id]);
  return state;
}
