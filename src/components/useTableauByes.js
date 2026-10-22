import { useEffect, useState } from 'react';
import API from '../api';
import { watchTableauByes } from '../lib/tableauByes';
import { pollWhileVisible } from '../lib/polling';
import { RESULT_REFRESH_MS } from '../lib/resultSync';
export default function useTableauByes(competitionId, fallback) {
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!competitionId) return;
    const controller = new AbortController();
    const watcher = watchTableauByes(
      competitionId,
      async (id) => (await API.get(`/matches/tableau/${id}`, { signal: controller.signal })).data,
      (byes) => setSnapshot({ competitionId, byes }),
    );
    watcher.refresh();
    const stop = pollWhileVisible(() => watcher.refresh(), RESULT_REFRESH_MS, { follow: false });
    return () => {
      watcher.stop();
      controller.abort();
      stop();
    };
  }, [competitionId]);
  return snapshot?.competitionId === competitionId ? snapshot.byes : fallback;
}
