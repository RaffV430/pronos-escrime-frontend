import { useCallback, useEffect, useRef, useState } from 'react';
import API from '../api';
import { pollWhileVisible } from '../lib/polling';
import { FencerFollowsContext as Context } from '../lib/fencerFollows';
const empty = { favorites: [], links: [], ambiguousIds: [], matchNames: [] };
export function FencerFollowsProvider({ userId, competitionId, children }) {
  const [data, setData] = useState(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    try {
      const { data: result } = await API.get('/me/fencers', { params: competitionId ? { competitionId } : {} });
      if (seq === sequence.current) {
        setData({ ...result, competitionId });
        setReady(true);
        setError('');
      }
    } catch (e) {
      if (seq === sequence.current) {
        setReady(false);
        setError(e.response?.data?.error || 'Impossible de charger vos tireurs suivis. Réessayez.');
      }
    }
  }, [competitionId]);
  const invalidate = useCallback(() => {
    sequence.current += 1;
  }, []);
  useEffect(() => {
    refresh();
    const stop = pollWhileVisible(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      invalidate();
      stop();
      window.removeEventListener('focus', refresh);
    };
  }, [userId, refresh, invalidate]);
  const mutation = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      await refresh();
      return result;
    } catch (e) {
      setError(e.response?.data?.error || 'Modification non enregistrée. Réessayez.');
      return null;
    } finally {
      setBusy(false);
    }
  };
  const current = data.competitionId === competitionId && ready;
  const value = {
    favorites: data.favorites,
    links: current ? data.links : [],
    ambiguousIds: current ? data.ambiguousIds : [],
    matchNames: current ? data.matchNames : [],
    ready: current,
    busy,
    error,
    refresh,
    follow: (entryId, eventId = competitionId) =>
      mutation(() => API.post('/me/fencers', { competitionId: eventId, entryId: String(entryId) })),
    remove: (id) => mutation(() => API.delete(`/me/fencers/${id}`)),
    importLocal: (items) => mutation(async () => (await API.post('/me/fencers/import', { items })).data),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
