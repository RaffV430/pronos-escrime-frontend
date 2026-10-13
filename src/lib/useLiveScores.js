// Scores en direct des pistes (FencingTimeLive, via le serveur), poussés à chaque touche par un flux
// continu (Server-Sent Events). Si le flux n'est pas disponible, relecture toutes les 4 s.
// Coupé quand la page est cachée, rouvert dès qu'elle revient. Affichage seulement, jamais de points.
import { useEffect, useState } from 'react';
import API from '../api';
import { scoresForCompetition } from './liveScoreState';

const EVERY_MS = 4000;
const EMPTY = new Map();
const toMap = (data) => new Map((Array.isArray(data) ? data : []).map((x) => [x.matchId, x]));

export function useLiveScores(competitionId, active = true) {
  const [snapshot, setSnapshot] = useState({ competitionId: null, scores: EMPTY });
  useEffect(() => {
    if (!competitionId || !active) return undefined;
    let stopped = false,
      source = null,
      timer = null,
      failures = 0;
    const poll = async () => {
      if (stopped || document.hidden) return;
      try {
        const { data } = await API.get(`/matches/live/${competitionId}`);
        if (!stopped) setSnapshot({ competitionId, scores: toMap(data) });
      } catch {
        /* le dernier état reste affiché */
      }
      if (!stopped) timer = setTimeout(poll, EVERY_MS);
    };
    const open = () => {
      if (stopped || document.hidden || source) return;
      if (typeof EventSource === 'undefined' || failures > 2) return poll();
      source = new EventSource(`${API.defaults.baseURL}/public/competitions/${competitionId}/live/stream`);
      source.onmessage = (event) => {
        failures = 0;
        try {
          setSnapshot({ competitionId, scores: toMap(JSON.parse(event.data)) });
        } catch {
          /* message illisible : ignoré */
        }
      };
      source.onerror = () => {
        failures++;
        if (failures > 2) {
          source?.close();
          source = null;
          poll();
        }
      };
    };
    const close = () => {
      source?.close();
      source = null;
      clearTimeout(timer);
    };
    const visibility = () => (document.hidden ? close() : open());
    document.addEventListener('visibilitychange', visibility);
    open();
    return () => {
      stopped = true;
      close();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [competitionId, active]);
  return scoresForCompetition(snapshot, competitionId, active);
}

export const clockLabel = (seconds) =>
  Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '';
