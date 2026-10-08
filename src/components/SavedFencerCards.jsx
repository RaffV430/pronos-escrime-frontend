import { useEffect, useState } from 'react';
import API from '../api';
import { useFencerFollows } from '../lib/fencerFollows';
import { followedMatchTarget } from '../lib/followedMatch';
import { eventNameFr } from '../lib/eventName';

// Keep every saved identity visible, even without a published entry or match.
export default function SavedFencerCards({ tournaments, userId, onOpen }) {
  const follows = useFencerFollows();
  const [appearances, setAppearances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setAppearances([]);
    setError('');
    setLoading(false);
    if (!tournaments.length || !follows.favorites.length) return () => controller.abort();
    setLoading(true);
    Promise.all(tournaments.filter(tournament => !tournament.archivedAt).map(async tournament => {
      const { data: events } = await API.get(`/podium/competitions/${tournament.id}`, { signal: controller.signal });
      return (await Promise.all(events.map(async event => {
        const { data: followed } = await API.get('/me/fencers', { params: { competitionId: event.id }, signal: controller.signal });
        if (!followed.links.length) return [];
        const { data: matches } = await API.get('/matches', { params: { competitionId: event.id }, signal: controller.signal });
        return followed.links.flatMap(link => {
          const fencer = (event.podiumRoster || []).find(entry => String(entry.id) === link.entryId);
          if (!fencer) return [];
          // Use the server-resolved identity; ambiguous names never acquire a match.
          const matching = followed.matchNames?.includes(fencer.name) ? matches.filter(m => m.player1 === fencer.name || m.player2 === fencer.name) : [];
          return [{ favoriteId: link.favoriteId, event, tournament, matches: matching }];
        });
      }))).flat();
    })).then(data => { if (!controller.signal.aborted) setAppearances(data.flat()); })
      .catch(() => { if (!controller.signal.aborted) setError('Les informations de match sont indisponibles. Vos favoris restent enregistrés.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tournaments, follows.favorites, revision]);
  return <section className="saved-fencer-cards followed-event-fencers" aria-label="Mes tireurs enregistrés">
    <h2>Mes tireurs · {follows.favorites.length}</h2>
    {!follows.ready && <p role="status">Chargement de vos favoris…</p>}
    {follows.error && <p role="alert">{follows.error} <button onClick={follows.refresh}>Réessayer</button></p>}
    {loading && <p role="status">Recherche des épreuves et des matchs…</p>}
    {error && <p role="alert">{error} <button onClick={() => setRevision(n => n + 1)}>Réessayer</button></p>}
    {follows.ready && !follows.favorites.length && <p>Aucun tireur enregistré. Ouvrez « Rechercher et gérer mes tireurs » pour ajouter vos favoris.</p>}
    <div className="followed-category"><div className="followed-category-cards">
      {follows.favorites.map(favorite => {
        const entries = appearances.filter(a => a.favoriteId === favorite.id);
        const target = followedMatchTarget(entries.flatMap(a => a.matches.map(match => ({ ...a, match }))), userId);
        const appearance = target || entries[0];
        const date = target?.match.startsAt ? new Date(target.match.startsAt) : null;
        const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Horaire à confirmer';
        return <article className="arena-home-match" key={favorite.id} title={appearance?.tournament.name}>
          <span><strong><span className="favorite-star" aria-hidden="true">★</span> {favorite.name}</strong>
            <small className="followed-fencer-meta"><span>{favorite.country || 'Nation non renseignée'}</span><span>{appearance ? eventNameFr(appearance.event.name) : favorite.club || 'Épreuve à confirmer'}</span></small>
            <small className="followed-fencer-schedule"><span>{time}</span><span>{target?.match.strip ? `Piste ${target.match.strip}` : 'Piste à confirmer'}</span></small>
          </span>
          {target && <button className="button-secondary" aria-label={`Voir le match de ${favorite.name}`} onClick={() => onOpen(target)}>Match →</button>}
        </article>;
      })}
    </div></div>
  </section>;
}
