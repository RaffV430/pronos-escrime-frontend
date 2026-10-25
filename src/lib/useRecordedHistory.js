import { useEffect, useState } from 'react';
import API from '../api';
// One selected finished match, never one request per result card.
export function useRecordedHistory(matchId, enabled) {
  const [state, setState] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || !matchId) return;
    let active = true;
    API.get(`/public/matches/${matchId}/live-history`)
      .then(({ data }) => {
        if (active) setState({ matchId, ...data });
      })
      .catch(() => {
        if (active) setState({ matchId, error: 'Historique temporairement indisponible.' });
      });
    return () => {
      active = false;
    };
  }, [matchId, enabled, retry]);
  return { data: enabled && state?.matchId === matchId ? state : null, retry: () => setRetry((n) => n + 1) };
}
