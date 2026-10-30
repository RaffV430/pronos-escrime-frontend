import { useEffect, useState } from 'react';
import API from '../api';
import { requestRecordedHistory } from './recordedHistoryRequest';
// One selected finished match, never one request per result card.
export function useRecordedHistory(matchId, enabled) {
  const [state, setState] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || !matchId) return;
    return requestRecordedHistory((url) => API.get(url), matchId, setState);
  }, [matchId, enabled, retry]);
  return { data: enabled && state?.matchId === matchId ? state : null, retry: () => setRetry((n) => n + 1) };
}
