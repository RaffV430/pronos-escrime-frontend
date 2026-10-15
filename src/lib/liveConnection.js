import { applyLiveMessage } from './liveScoreState.js';

// Une seule connexion par épreuve dans la page, partagée par le bandeau, les cartes et le détail.
export function createLiveConnections({
  eventSource,
  get,
  baseURL,
  document,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const connections = new Map();
  return (id, listener) => {
    let entry = connections.get(id);
    if (!entry) {
      entry = {
        listeners: new Set(),
        scores: new Map(),
        source: null,
        timer: null,
        failures: 0,
        closed: false,
        polling: false,
        generation: 0,
      };
      const publish = (scores) => {
        entry.scores = scores;
        for (const callback of entry.listeners) callback(scores);
      };
      const poll = async () => {
        if (entry.closed || document.hidden || entry.polling) return;
        entry.polling = true;
        const generation = entry.generation;
        try {
          const { data } = await get(`/matches/live/${id}`);
          if (!entry.closed && !document.hidden && generation === entry.generation)
            publish(applyLiveMessage(new Map(), data));
        } catch {
          /* conserver le dernier état */
        } finally {
          entry.polling = false;
          if (!entry.closed && !document.hidden) entry.timer = setTimer(poll, 4000);
        }
      };
      const close = () => {
        entry.generation++;
        entry.source?.close();
        entry.source = null;
        clearTimer(entry.timer);
        entry.timer = null;
      };
      const open = () => {
        if (entry.closed || document.hidden || entry.source || entry.timer) return;
        if (!eventSource || entry.failures > 2) return poll();
        const source = new eventSource(`${baseURL}/public/competitions/${id}/live/stream?delta=1`);
        entry.source = source;
        source.onmessage = (event) => {
          if (entry.closed || entry.source !== source) return;
          try {
            const next = applyLiveMessage(entry.scores, JSON.parse(event.data));
            entry.failures = 0;
            publish(next);
          } catch {
            // Une perte de séquence provoque un nouvel instantané, jamais des touches inventées.
            close();
            entry.timer = setTimer(() => {
              entry.timer = null;
              open();
            }, 0);
          }
        };
        source.onerror = () => {
          if (entry.source !== source) return;
          if (++entry.failures > 2) {
            close();
            poll();
          }
        };
      };
      entry.visibility = () => (document.hidden ? close() : open());
      entry.stop = () => {
        entry.closed = true;
        close();
        document.removeEventListener('visibilitychange', entry.visibility);
      };
      connections.set(id, entry);
      document.addEventListener('visibilitychange', entry.visibility);
      entry.listeners.add(listener);
      listener(entry.scores);
      open();
    } else {
      entry.listeners.add(listener);
      listener(entry.scores);
    }
    return () => {
      entry.listeners.delete(listener);
      if (!entry.listeners.size) {
        entry.stop();
        connections.delete(id);
      }
    };
  };
}
