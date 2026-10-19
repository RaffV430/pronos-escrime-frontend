// Flux partagé, différentiel, avec repli HTTP inchangé à 4 secondes.
import { useEffect, useState } from 'react';
import API from '../api';
import { scoresForCompetition } from './liveScoreState';
import { createLiveConnections } from './liveConnection';
import { createLiveWireDecoder } from './liveWire';
const subscribe = createLiveConnections({
  eventSource: typeof EventSource === 'undefined' ? null : EventSource,
  get: (url) => API.get(url),
  baseURL: API.defaults.baseURL,
  document,
  decodeWire: createLiveWireDecoder(),
});
export function useLiveScores(competitionId, active = true) {
  const [snapshot, setSnapshot] = useState({ competitionId: null, scores: new Map() });
  useEffect(() => {
    if (!competitionId || !active) return undefined;
    return subscribe(competitionId, (scores) => setSnapshot({ competitionId, scores }));
  }, [competitionId, active]);
  return scoresForCompetition(snapshot, competitionId, active);
}

export const clockLabel = (seconds) =>
  Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '';
