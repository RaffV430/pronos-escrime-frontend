import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { CACHE_EVENT } from '../lib/fieldCache';
import { isBigGain } from '../lib/uxFeatures';
import { useUxSettings } from '../lib/useUxSettings';
import { useResultSync } from '../lib/useResultSync';
// Les montants viennent exclusivement du bilan du serveur. Aucune alerte rétroactive à l'ouverture.
// Le bilan n'est relu qu'à la publication d'un résultat (signal du veilleur de résultats) ou au retour dans l'app,
// jamais à intervalle fixe : le serveur n'est pas sollicité pendant que rien ne change.
export default function GainAlerts({ userId }) {
  const prefs = useUxSettings(userId),
    seen = useRef(new Map()),
    baseline = useRef(false);
  const [alerts, setAlerts] = useState([]);
  // Épreuves où le joueur attend encore des résultats : surveillées même si elles ne sont pas affichées.
  const [pending, setPending] = useState([]);
  useResultSync(prefs.gains ? pending : []);
  useEffect(() => {
    seen.current = new Map();
    baseline.current = false;
    setAlerts([]);
    if (!prefs.gains) return;
    const c = new AbortController();
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const { data } = await API.get('/me/season', { signal: c.signal });
        if (c.signal.aborted) return;
        const fresh = [],
          waiting = new Set();
        for (const t of data.tournaments || [])
          for (const event of t.competitions || [])
            for (const row of event.rows || []) {
              if (row.outcome === 'pending') waiting.add(String(event.id));
              const key = `${event.id}:${row.key}`,
                previous = seen.current.get(key);
              if (baseline.current && row.points > (previous ?? -1) && isBigGain(row))
                fresh.push({ key, text: `+${row.points} points · ${row.name} · ${event.name}` });
              seen.current.set(key, row.points);
            }
        baseline.current = true;
        setPending((old) => {
          const next = [...waiting].sort();
          return next.join(',') === old.join(',') ? old : next;
        });
        if (fresh.length)
          setAlerts((old) => [...fresh, ...old.filter((a) => !fresh.some((n) => n.key === a.key))].slice(0, 3));
      } catch {
        /* La consultation continue sans alerte si le bilan est inaccessible. */
      }
    };
    refresh();
    let burst = null;
    const published = (event) => {
      if (!event.detail?.resultsChanged || burst) return;
      // Plusieurs résultats publiés d'un coup : une seule relecture.
      burst = setTimeout(() => {
        burst = null;
        refresh();
      }, 1500);
    };
    const back = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener(CACHE_EVENT, published);
    document.addEventListener('visibilitychange', back);
    return () => {
      c.abort();
      clearTimeout(burst);
      window.removeEventListener(CACHE_EVENT, published);
      document.removeEventListener('visibilitychange', back);
    };
  }, [userId, prefs.gains]);
  if (!alerts.length) return null;
  return (
    <aside className="ux-gain-alerts" aria-label="Gros gains" role="status">
      {alerts.map((a) => (
        <p key={a.key}>
          <strong>{a.text}</strong>
          <button
            className="button-link"
            aria-label="Fermer l’alerte"
            onClick={() => setAlerts((old) => old.filter((x) => x.key !== a.key))}
          >
            ×
          </button>
        </p>
      ))}
    </aside>
  );
}
