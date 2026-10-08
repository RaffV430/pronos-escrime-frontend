import { useEffect, useState } from 'react';
import API from '../api';
import { useFencerFollows } from '../lib/fencerFollows';
import { followedMatchTarget } from '../lib/followedMatch';

export default function HomeFollowedFencers({ tournamentId, userId, onOpen }) {
  const follows = useFencerFollows();
  const [fencers, setFencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setFencers([]);
    setError('');
    setLoading(Boolean(tournamentId));
    if (!tournamentId) return () => controller.abort();
    API.get(`/podium/competitions/${tournamentId}`, { signal: controller.signal })
      .then(async ({ data }) => {
        const entries = await Promise.all(data.map(async event => {
          const { data: followed } = await API.get('/me/fencers', { params: { competitionId: event.id }, signal: controller.signal });
          return (event.podiumRoster || []).flatMap(fencer => {
            const link = followed.links.find(l => l.entryId === String(fencer.id));
            return link ? [{ event, fencer, key: link.favoriteId || `${fencer.name}:${fencer.country || ''}:${fencer.club || ''}` }] : [];
          });
        }));
        const grouped = new Map();
        for (const entry of entries.flat()) {
          if (!grouped.has(entry.key)) grouped.set(entry.key, { ...entry.fencer, key: entry.key, appearances: [] });
          grouped.get(entry.key).appearances.push(entry);
        }
        if (!controller.signal.aborted) setFencers([...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      })
      .catch(() => { if (!controller.signal.aborted) setError('Vos tireurs ne peuvent pas être chargés pour le moment.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tournamentId, follows?.favorites]);
  const open = async fencer => {
    setBusy(fencer.key);
    setError('');
    try {
      const entries = await Promise.all(fencer.appearances.map(async ({ event, fencer: entry }) => {
        const { data } = await API.get('/matches', { params: { competitionId: event.id } });
        return data.filter(m => m.player1 === entry.name || m.player2 === entry.name).map(match => ({ match, event }));
      }));
      const target = followedMatchTarget(entries.flat(), userId);
      onOpen(target || { event: fencer.appearances[0].event, mode: 'follow', match: null });
    } catch { setError('Impossible de charger le match. Réessayez.'); }
    finally { setBusy(null); }
  };
  return <div className="home-followed-fencers">
    {loading && <p className="muted" role="status">Recherche de vos tireurs engagés…</p>}
    {error && <p role="alert">{error}</p>}
    {fencers.length > 0 && <>
      <p className="home-followed-label"><span className="favorite-star" aria-hidden="true">★</span> Mes tireurs engagés</p>
      <div className="home-followed-names">
        {fencers.map(fencer => <button className="button-link" key={fencer.key} disabled={busy !== null} onClick={() => open(fencer)}>
          {busy === fencer.key ? 'Chargement…' : fencer.name}<svg className="home-fencer-foil" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 15 21 3M6 13c2-1 5 1 4 5M7.5 16.5 4 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>)}
      </div>
    </>}
  </div>;
}
