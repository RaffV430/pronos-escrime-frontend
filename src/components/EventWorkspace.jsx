import { useNow } from '../lib/polling';
import { useFencerFollows } from '../lib/fencerFollows';
import { isMatchClosed } from './matchPresentation';
import ResultsPools from './ResultsPools';
import ResultsBracket from './ResultsBracket';
import PisteLive from './PisteLive';
import { useState } from 'react';

export function FollowedEventFencers({ competition, matches, userId, onMatch, onLive }) {
  const now = useNow(5000);
  const follows = useFencerFollows();
  const roster = (competition?.podiumRoster || []).filter((e) =>
    follows?.links.some((l) => l.entryId === String(e.id)),
  );
  if (!follows?.ready) return <p>Chargement de vos tireurs…</p>;
  return (
    <section className="followed-event-fencers" aria-label="Mes tireurs dans cette épreuve">
      <h2>Mes tireurs</h2>
      {!roster.length && (
        <p>Aucun de vos tireurs suivis n’est identifié dans cette épreuve. Ajoutez-en depuis Moi → Mes tireurs.</p>
      )}
      {roster.map((e) => {
        const appearances = matches.filter((m) => m.player1 === e.name || m.player2 === e.name);
        const open = appearances
          .filter((m) => !isMatchClosed(m, now))
          .sort((a, b) => Date.parse(a.closesAt || a.startsAt) - Date.parse(b.closesAt || b.startsAt));
        const target = open.find((m) => !m.predictions?.some((p) => p.userId === userId)) || open[0];
        const upcoming = appearances.filter((m) => !m.isFinished)
          .sort((a, b) => (Date.parse(a.startsAt) || Infinity) - (Date.parse(b.startsAt) || Infinity))[0];
        const latest = upcoming || appearances.at(-1);
        const scheduled = upcoming?.startsAt && Number.isFinite(Date.parse(upcoming.startsAt));
        return (
          <article className="arena-home-match" key={e.id}>
            <span>
              <strong><span className="favorite-star">★</span> {e.name}</strong>
              <small>{[e.nation || e.country, e.club].filter(Boolean).join(' · ')}</small>
              <small className="followed-next-match">
                {upcoming ? <>
                  Prochain match · {scheduled ? new Date(upcoming.startsAt).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : 'Horaire non publié'}
                  {' · '}{upcoming.strip ? `Piste ${upcoming.strip}` : 'Piste non publiée'}
                </> : 'Prochain match non publié'}
              </small>
            </span>
            {target ? (
              <button onClick={() => onMatch(target.id)}>Pronostiquer →</button>
            ) : latest ? (
              <button className="button-secondary" onClick={() => onLive(latest.id)}>
                Suivre le match →
              </button>
            ) : (
              <span>En attente de son prochain match</span>
            )}
          </article>
        );
      })}
      {!!follows.ambiguousIds.length && (
        <p>Certains noms demandent une confirmation : consultez Mes tireurs dans Moi.</p>
      )}
    </section>
  );
}
export function CompetitionFollow({ view, competition, matches, userId, ready, error, stale }) {
  const [matchId, setMatchId] = useState(null);
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
      <ResultsBracket matches={matches} selectedId={matchId} onCloseDetail={() => setMatchId(null)}
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
