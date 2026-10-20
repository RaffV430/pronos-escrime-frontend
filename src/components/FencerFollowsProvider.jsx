import { useCallback, useEffect, useRef, useState } from 'react';
import API from '../api';
import { pollWhileVisible } from '../lib/polling';
import { FencerFollowsContext as Context } from '../lib/fencerFollows';
import { FOLLOWED_EVENT } from '../lib/fencerNotifPrompt';
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
        // Même contenu : garder la même référence pour ne pas relancer (et vider) les listes qui en dépendent.
        const next = { ...result, competitionId };
        setData((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        setReady(true);
        setError('');
      }
    } catch (e) {
      if (seq === sequence.current) {
        if ([401, 403, 404].includes(e.response?.status)) {
          setData(empty);
          setReady(false);
        }
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
  // Tireur ajouté : signal pour l'invitation aux notifications « Mes tireurs ».
  const followed = async (pending) => {
    const result = await pending;
    if (result) window.dispatchEvent(new Event(FOLLOWED_EVENT));
    return result;
  };
  const current = data.competitionId === competitionId && ready;
  const value = {
    favorites: data.favorites,
    links: current ? data.links : [],
    ambiguousIds: current ? data.ambiguousIds : [],
    matchNames: current ? data.matchNames : [],
    clubNames: current ? data.clubNames || [] : [],
    ready: current,
    busy,
    error,
    refresh,
    follow: (entryId, eventId = competitionId) =>
      followed(mutation(() => API.post('/me/fencers', { competitionId: eventId, entryId: String(entryId) }))),
    followProfile: (affiliationId) => followed(mutation(() => API.post('/me/fencers', { affiliationId }))),
    remove: (id) => mutation(() => API.delete(`/me/fencers/${id}`)),
    importLocal: (items) => mutation(async () => (await API.post('/me/fencers/import', { items })).data),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
