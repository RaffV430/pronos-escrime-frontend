import { useEffect, useState } from 'react';
import API from '../api';
import { useFencerFollows } from '../lib/fencerFollows';
import { followedMatchTarget } from '../lib/followedMatch';
import { followedPool, followedSchedule } from '../lib/followedSchedule';
import { eventNameFr } from '../lib/eventName';
import { prioritizeFencerGroups } from '../lib/fencerGroups';

// Keep every saved identity visible, even without a published entry or match.
export default function SavedFencerCards({ tournaments, userId, onOpen }) {
  const follows = useFencerFollows();
  const [appearances, setAppearances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [observedAt, setObservedAt] = useState(() => Date.now());
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setLoading(false);
    if (!tournaments.length || !follows.favorites.length) return () => controller.abort();
    setLoading(true);
    Promise.all([
      API.get('/tournaments', { params: { active: true }, signal: controller.signal }),
      API.get('/public/tournaments', { signal: controller.signal }),
    ])
      .then(([{ data: currentTournaments }, { data: calendar }]) =>
        Promise.all(
          currentTournaments.map(async (tournament) => {
            const { data: events } = await API.get(`/podium/competitions/${tournament.id}`, {
              signal: controller.signal,
            });
            return (
              await Promise.all(
                events
                  .filter(
                    (event) =>
                      !(event.podiumResolvedAt && event.resultsVerifiedAt && event.officialPodium?.finalConfirmed),
                  )
                  .map(async (event) => {
                    const { data: followed } = await API.get('/me/fencers', {
                      params: { competitionId: event.id },
                      signal: controller.signal,
                    });
                    if (!followed.links.length) return [];
                    const [{ data: matches }, { data: pools }] = await Promise.all([
                      API.get('/matches', { params: { competitionId: event.id }, signal: controller.signal }),
                      API.get('/pools', { params: { competitionId: event.id }, signal: controller.signal }),
                    ]);
                    return followed.links.flatMap((link) => {
                      const fencer = (event.podiumRoster || []).find((entry) => String(entry.id) === link.entryId);
                      if (!fencer) return [];
                      // Use the server-resolved identity; ambiguous names never acquire a match.
                      const matching = followed.matchNames?.includes(fencer.name)
                        ? matches.filter((m) => m.player1 === fencer.name || m.player2 === fencer.name)
                        : [];
                      const scheduled = calendar
                        .find((t) => t.id === tournament.id)
                        ?.competitions.find((c) => c.id === event.id);
                      return [
                        {
                          favoriteId: link.favoriteId,
                          event: { ...event, startsAt: scheduled?.startsAt },
                          tournament,
                          matches: matching,
                          pool: followedPool(pools, fencer.name, followed.matchNames),
                        },
                      ];
                    });
                  }),
              )
            ).flat();
          }),
        ),
      )
      .then((data) => {
        if (!controller.signal.aborted) {
          setAppearances(data.flat());
          setObservedAt(Date.now());
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Les informations de match sont indisponibles. Vos favoris restent enregistrés.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tournaments, follows.favorites, revision]);
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) setRevision((n) => n + 1);
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const groups = new Map();
  for (const favorite of follows.favorites) {
    const entries = appearances.filter((a) => a.favoriteId === favorite.id);
    for (const appearance of entries.length ? entries : [null]) {
      const key = appearance ? `${appearance.tournament.id}:${appearance.event.id}` : 'unassigned';
      if (!groups.has(key)) groups.set(key, { key, appearance, cards: [] });
      const target = appearance
        ? followedMatchTarget(
            appearance.matches.map((match) => ({ ...appearance, match })),
            userId,
          )
        : null;
      groups.get(key).cards.push({ favorite, appearance, target });
    }
  }
  const orderedGroups = [...groups.values()].sort((a, b) => {
    if (!a.appearance) return 1;
    if (!b.appearance) return -1;
    return (
      a.appearance.tournament.name.localeCompare(b.appearance.tournament.name, 'fr') ||
      a.appearance.event.id - b.appearance.event.id
    );
  });
  const { featured, upcoming, unknown, live } = prioritizeFencerGroups(orderedGroups, observedAt);
  const renderGroup = (group) => (
    <div className="followed-category" key={group.key}>
      <div className="followed-category-heading">
        <h3>{group.appearance ? eventNameFr(group.appearance.event.name) : 'Sans épreuve active'}</h3>
        <span>
          {group.cards.length} tireur{group.cards.length > 1 ? 's' : ''}
        </span>
        {group.appearance && (
          <small>
            {group.appearance.tournament.name}
            {group.appearance.event.startsAt &&
              ` · ${new Date(group.appearance.event.startsAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
          </small>
        )}
      </div>
      <div className="followed-category-cards">
        {group.cards.map(({ favorite, appearance, target }) => {
          const schedule = followedSchedule(target?.match, appearance?.pool);
          const time = appearance ? schedule.time : 'En attente d’un engagement';
          return (
            <article className="arena-home-match" key={favorite.id} title={appearance?.tournament.name}>
              <span>
                <strong>
                  <span className="favorite-star" aria-hidden="true">
                    ★
                  </span>{' '}
                  {favorite.name}
                </strong>
                <small className="followed-fencer-meta">
                  <span>{favorite.country || 'Nation non renseignée'}</span>
                </small>
                <small className="followed-fencer-schedule">
                  <span>{schedule.poolName && `${schedule.poolName} · `}{time}</span>
                  <span>
                    {appearance ? schedule.strip : 'Favori conservé'}
                  </span>
                </small>
              </span>
              {target && (
                <button
                  className="button-secondary"
                  aria-label={`Voir le match de ${favorite.name}`}
                  onClick={() => onOpen(target)}
                >
                  Match →
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
  return (
    <section className="saved-fencer-cards followed-event-fencers" aria-label="Mes tireurs enregistrés">
      <h2>Mes tireurs · {follows.favorites.length}</h2>
      <p className="saved-fencer-refresh">Par épreuve active · mise à jour automatique</p>
      {!follows.ready && <p role="status">Chargement de vos favoris…</p>}
      {follows.error && (
        <p role="alert">
          {follows.error} <button onClick={follows.refresh}>Réessayer</button>
        </p>
      )}
      {loading && !appearances.length && <p role="status">Recherche des épreuves et des matchs…</p>}
      {error && (
        <p role="alert">
          {error} <button onClick={() => setRevision((n) => n + 1)}>Réessayer</button>
        </p>
      )}
      {follows.ready && !follows.favorites.length && (
        <p>Aucun tireur enregistré. Ouvrez « Rechercher et gérer mes tireurs » pour ajouter vos favoris.</p>
      )}
      <div className="fencer-live">
        <h3>{live ? 'Suivi en cours' : 'Prochaine épreuve'}</h3>
        {featured.length ? featured.map(renderGroup) : <p>Aucune épreuve avec horaire confirmé pour vos tireurs.</p>}
      </div>
      {!!upcoming.length && (
        <details className="fencer-secondary">
          <summary>
            À venir · {upcoming.length} épreuve{upcoming.length > 1 ? 's' : ''}
          </summary>
          {upcoming.map(renderGroup)}
        </details>
      )}
      {!!unknown.length && (
        <details className="fencer-secondary">
          <summary>Autres favoris · horaires à confirmer</summary>
          {unknown.map(renderGroup)}
        </details>
      )}
    </section>
  );
}
