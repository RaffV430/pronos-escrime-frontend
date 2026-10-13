// Scores en direct des pistes (FencingTimeLive, via le serveur) : relus toutes les 4 s tant que l'épreuve
// a des rencontres non terminées et que la page est visible. Affichage seulement, jamais de points.
import { useEffect, useState } from 'react';
import API from '../api';

const EVERY_MS = 4000;
const EMPTY = new Map();

export function useLiveScores(competitionId, active = true) {
  const [live, setLive] = useState(EMPTY);
  useEffect(() => {
    if (!competitionId || !active) return undefined;
    let stopped = false,
      timer = null;
    const load = async () => {
      if (!document.hidden) {
        try {
          const { data } = await API.get(`/matches/live/${competitionId}`);
          if (!stopped) setLive(new Map((Array.isArray(data) ? data : []).map((x) => [x.matchId, x])));
        } catch {
          /* réseau ou serveur indisponible : le dernier état reste affiché jusqu'au prochain essai */
        }
      }
      if (!stopped) timer = setTimeout(load, EVERY_MS);
    };
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [competitionId, active]);
  return competitionId && active ? live : EMPTY;
}

export const clockLabel = (seconds) =>
  Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '';
