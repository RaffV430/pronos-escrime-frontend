import { useEffect, useState } from 'react';
import API from '../api';
import { eventNameFr } from '../lib/eventName';
import { withCount } from '../lib/plural';

// Maquette navigation 2 : les épreuves ouvertes en cartes, au lieu de deux listes déroulantes.
// Un toucher ouvre directement l'épreuve (même chemin qu'un lien partagé).
const day = (iso) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))
    : null;

export default function EventCards({ onOpen }) {
  const [state, setState] = useState({ loading: true, error: '', cards: [] });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setState((s) => ({ ...s, loading: true, error: '' }));
    (async () => {
      try {
        const [{ data: tournaments }, calendar] = await Promise.all([
          API.get('/tournaments?active=true', { signal: c.signal, forceRefresh: true }),
          API.get('/public/calendar', { signal: c.signal }).catch(() => ({ data: { events: [] } })),
        ]);
        const dates = new Map();
        for (const e of calendar.data?.events || [])
          for (const id of e.competitionIds || []) if (!dates.has(id)) dates.set(id, e);
        const lists = await Promise.all(
          tournaments.map((t) =>
            API.get(`/podium/competitions/${t.id}`, { signal: c.signal })
              .then(({ data }) => data.map((event) => ({ tournament: t, event })))
              .catch(() => []),
          ),
        );
        const cards = lists
          .flat()
          .map((card) => ({ ...card, info: dates.get(card.event.id) || null }))
          .sort((a, b) => String(a.info?.start || '9').localeCompare(String(b.info?.start || '9')));
        if (!c.signal.aborted) setState({ loading: false, error: '', cards });
      } catch {
        if (!c.signal.aborted)
          setState({ loading: false, error: 'Impossible de charger les épreuves. Vérifiez la connexion.', cards: [] });
      }
    })();
    return () => c.abort();
  }, [retry]);
  return (
    <section className="nav2-events feature-panel" aria-labelledby="nav2-events-title">
      <p className="arena-eyebrow">PRONOSTIQUER</p>
      <h1 id="nav2-events-title">Épreuves ouvertes</h1>
      <p className="muted">Touchez une épreuve pour faire vos pronostics : poules, tableau et podium.</p>
      {state.loading && <p className="muted">Chargement des épreuves…</p>}
      {state.error && (
        <p role="alert">
          {state.error}{' '}
          <button type="button" className="button-link" onClick={() => setRetry((n) => n + 1)}>
            Réessayer
          </button>
        </p>
      )}
      {!state.loading && !state.error && !state.cards.length && (
        <p>Aucune épreuve ouverte aux pronostics pour le moment. Le calendrier annonce les prochaines.</p>
      )}
      <ul className="nav2-event-list">
        {state.cards.map(({ tournament, event, info }) => (
          <li key={event.id}>
            <button type="button" onClick={() => onOpen(tournament, event)}>
              <span className="nav2-event-when">{day(info?.start) || 'Date à confirmer'}</span>
              <strong>{eventNameFr(event.name)}</strong>
              <small>
                {tournament.name}
                {info?.city ? ` · ${info.city}` : ''}
              </small>
              <span className="nav2-event-meta">
                {event.matches?.length ? withCount(event.matches.length, 'match', 'matchs') : 'Poules et podium'}
                {info?.tableauPhase === 'preliminary' ? ' · J1 préliminaire' : ''}
                {info?.tableauPhase === 'main' ? ' · J2 principal' : ''}
              </span>
              <span className="nav2-event-go" aria-hidden="true">
                Pronostiquer →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
