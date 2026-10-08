import { eventNameFr } from '../lib/eventName';
import { useFencerFollows } from '../lib/fencerFollows';
import { followedMatchTarget } from '../lib/followedMatch';
import ResultsPools from './ResultsPools';
import ResultsBracket from './ResultsBracket';
import PisteLive from './PisteLive';
import { useEffect, useRef, useState } from 'react';
import API from '../api';

export function FollowedEventFencers({ competition, userId, onMatch, onLive, onEventChange }) {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const follows = useFencerFollows();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setEvents([]);
    setEventId('all');
    setError('');
    API.get(`/podium/competitions/${competition.tournamentId}`, { signal: controller.signal })
      .then(async ({ data }) => {
        const entries = await Promise.all(data.map(async (event) => {
          const [{ data: followed }, { data: matches }] = await Promise.all([
            API.get('/me/fencers', { params: { competitionId: event.id }, signal: controller.signal }),
            API.get('/matches', { params: { competitionId: event.id }, signal: controller.signal }),
          ]);
          return { ...event, matches, followedRoster: (event.podiumRoster || []).filter(e => followed.links.some(l => l.entryId === String(e.id))) };
        }));
        if (!controller.signal.aborted) setEvents(entries);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Impossible de charger les tireurs du tournoi. Réessayez en rouvrant cette section.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [competition.tournamentId, follows?.favorites]);
  const visible = events.filter(e => eventId === 'all' || e.id === eventId);
  const openFencer = async (event, fencer) => {
    setBusy(`${event.id}:${fencer.id}`);
    setError('');
    try {
      const { data: matches } = await API.get('/matches', { params: { competitionId: event.id } });
      const target = followedMatchTarget(matches.filter(m => m.player1 === fencer.name || m.player2 === fencer.name).map(match => ({ match })), userId);
      if (!target) { setError('Aucun match publié pour ce tireur pour le moment.'); return; }
      onEventChange(event);
      if (target.mode === 'predictions') onMatch(target.match.id); else onLive(target.match.id);
    } catch { setError('Impossible de charger le match. Réessayez.'); }
    finally { setBusy(null); }
  };
  return (
    <section className="followed-event-fencers" aria-label="Mes tireurs du tournoi">
      <header className="followed-event-toolbar">
        <h2>Mes tireurs</h2>
        <p className="muted">Tous vos favoris du tournoi, indépendamment de l’épreuve choisie pour les pronostics.</p>
        <div className="filter-row followed-event-filters" aria-label="Filtrer mes tireurs par épreuve">
          <button aria-pressed={eventId === 'all'} onClick={() => setEventId('all')}>Toutes les épreuves</button>
          {events.map(event => <button key={event.id} aria-pressed={eventId === event.id} onClick={() => setEventId(event.id)}>{eventNameFr(event.name)}</button>)}
        </div>
      </header>
      {loading && <p role="status">Chargement de vos tireurs dans toutes les épreuves…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !visible.some(e => e.followedRoster.length) && <p>Aucun de vos tireurs suivis dans ces épreuves. Ajoutez-en depuis Moi → Mes tireurs.</p>}
      {visible.filter(event => event.followedRoster.length).map(event => (
        <section className="followed-category" key={event.id} aria-labelledby={`followed-category-${event.id}`}>
          <header className="followed-category-heading">
            <h3 id={`followed-category-${event.id}`}>{eventNameFr(event.name).replace(/cadettes/gi, 'Cadettes (dames)').replace(/cadets/gi, 'Cadets (hommes)')}</h3>
            <span>{event.followedRoster.length} {event.followedRoster.length > 1 ? 'tireurs suivis' : 'tireur suivi'}</span>
          </header>
          <div className="followed-category-cards">
          {event.followedRoster.map(e => {
            const target = followedMatchTarget((event.matches || []).filter(m => m.player1 === e.name || m.player2 === e.name).map(match => ({ match })), userId);
            const match = target?.match;
            const date = match?.startsAt ? new Date(match.startsAt) : null;
            const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Horaire à confirmer';
            return (
        <article className="arena-home-match" key={`${event.id}:${e.id}`}>
          <span>
            <strong><span className="favorite-star">★</span> {e.name}</strong>
            <small className="followed-fencer-meta"><span>{e.nation || e.country || '—'}</span><span>{eventNameFr(event.name)}</span></small>
            <small className="followed-fencer-schedule"><span>{time}</span><span>{match?.strip ? `Piste ${match.strip}` : 'Piste à confirmer'}</span></small>
          </span>
          <button className="button-secondary" disabled={busy !== null} onClick={() => openFencer(event, e)}>
            {busy === `${event.id}:${e.id}` ? 'Chargement…' : 'Match →'}
          </button>
        </article>
            );
          })}
          </div>
        </section>
      ))}
    </section>
  );
}
export function CompetitionFollow({ view, competition, matches, userId, ready, error, stale, initialMatchId = null }) {
  const [matchId, setMatchId] = useState(initialMatchId);
  const initialDetail = useRef(null);
  const initialMatch = initialMatchId && matchId === initialMatchId ? matches.find(m => m.id === initialMatchId) : null;
  useEffect(() => {
    if (initialMatch) initialDetail.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [initialMatch?.id]);
  if (view === 'pools') return <section className="feature-panel competition-follow"><ResultsPools competitionId={competition.id} /></section>;
  if (view === 'ranking')
    return (
      <section>
        <h2>Classement officiel</h2>
        {competition.officialPodium?.finalConfirmed ? (
          <ol>
            {[
              ['gold', 1],
              ['silver', 2],
              ['bronze1', 3],
              ['bronze2', 3],
            ].map(([key, place]) => {
              const e = (competition.podiumRoster || []).find(
                (e) => String(e.id) === String(competition.officialPodium[key]),
              );
              return e ? (
                <li key={key}>
                  {place} · {e.name}
                </li>
              ) : null;
            })}
          </ol>
        ) : (
          <p>Classement officiel pas encore publié.</p>
        )}
        {competition.resultsSourceUrl && (
          <a href={competition.resultsSourceUrl} target="_blank" rel="noreferrer">
            Consulter le classement complet sur le site officiel →
          </a>
        )}
      </section>
    );
  return (
    <section className="feature-panel competition-follow">
      {initialMatch && <section ref={initialDetail} className="followed-initial-detail" aria-label="Match de mon tireur">
        <button className="button-secondary" onClick={() => setMatchId(null)}>Refermer le détail ×</button>
        <PisteLive key={initialMatch.id} initialMatchId={initialMatch.id} matches={[initialMatch]}
          competition={competition} userId={userId} ready={ready} error={error} stale={stale}
          onPlay={() => setMatchId(null)} />
      </section>}
      <ResultsBracket matches={matches} selectedId={initialMatch ? null : matchId} onCloseDetail={() => setMatchId(null)}
        onOpen={(m) => setMatchId((old) => old === m.id ? null : m.id)}
        renderDetail={(match) => (
          <section aria-label="Détail du match sélectionné">
            <button className="button-secondary rb-detail-close" onClick={() => setMatchId(null)}>Refermer le détail ×</button>
            <PisteLive key={match.id} initialMatchId={match.id} matches={[match]}
              competition={competition} userId={userId} ready={ready} error={error} stale={stale}
              onPlay={() => setMatchId(null)} />
          </section>
        )}
      />
    </section>
  );
}
