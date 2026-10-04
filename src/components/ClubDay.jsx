import { useCallback, useEffect, useState } from 'react';
import API from '../api';
import { useClub } from '../lib/club';
import { pollWhileVisible } from '../lib/polling';
import { clubDay } from './clubDay';
import { roundLabel, stripLabel } from './matchPresentation';

const signed = (v) => (v > 0 ? `+${v}` : String(v));
const hour = (d) => (d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
const MEDALS = { gold: '🥇', silver: '🥈', bronze: '🥉' };

function PoolLine({ pool }) {
  const where = [pool.name, pool.strip && stripLabel(pool.strip).toLowerCase(), hour(pool.startsAt)]
    .filter(Boolean)
    .join(' · ');
  const played = pool.wins !== null && pool.losses !== null ? pool.wins + pool.losses : null;
  return (
    <p className="club-day-pool">
      <span>{where}</span>
      {played !== null && played > 0 && (
        <strong>
          {pool.final ? '' : `${played}/${pool.bouts} m. · `}
          {pool.wins} V · {signed(pool.indicator ?? 0)}
          {!pool.final && <span className="club-day-live"> · en direct</span>}
        </strong>
      )}
    </p>
  );
}

function Bout({ bout }) {
  if (!bout.finished)
    return (
      <li className="club-day-next">
        <span>{roundLabel(bout.round)}</span>{' '}
        <strong>{bout.opponent ? `contre ${bout.opponent}` : 'adversaire à déterminer'}</strong>
        {(bout.strip || bout.startsAt) && (
          <small> · {[bout.strip && stripLabel(bout.strip), hour(bout.startsAt)].filter(Boolean).join(' · ')}</small>
        )}
      </li>
    );
  return (
    <li className={bout.won ? 'won' : 'lost'}>
      <span>{roundLabel(bout.round)}</span> <strong>{bout.won ? 'V' : 'D'}</strong>{' '}
      {bout.medical ? 'retrait méd.' : bout.score ? `${bout.score[0]}–${bout.score[1]}` : ''}{' '}
      <small>{bout.opponent ? `contre ${bout.opponent}` : ''}</small>
    </li>
  );
}

// « Nos tireurs » : le parcours du jour de chaque tireur du club dans l'épreuve choisie.
export default function ClubDay({ competitionId, matches = [], team = false }) {
  const club = useClub();
  const [pools, setPools] = useState([]);
  const load = useCallback(
    () =>
      API.get(`/pools?competitionId=${competitionId}`)
        .then(({ data }) => setPools(Array.isArray(data) ? data : []))
        .catch(() => {}),
    [competitionId],
  );
  useEffect(() => {
    load();
    return pollWhileVisible(load, 30000);
  }, [load]);
  const days = clubDay(
    club.fencers.map((f) => (typeof f === 'string' ? f : f?.name)),
    pools,
    matches,
    { team },
  );
  return (
    <section className="club-day">
      <h2 className="section-title">Nos tireurs{club.name ? ` · ${club.name}` : ''}</h2>
      <p className="muted">Parcours du jour, mis à jour à chaque contrôle du site officiel.</p>
      {!days.length && <p className="muted">Aucun tireur du club dans cette épreuve pour l’instant.</p>}
      {days.map((d) => (
        <article key={d.name} className={`club-day-card is-${d.status.kind}`}>
          <header>
            <strong>
              <span className="club-star" aria-hidden="true">
                ★{' '}
              </span>
              {d.name}
            </strong>
            <span className="status-pill">
              {d.status.medal && `${MEDALS[d.status.medal]} `}
              {d.status.label}
              {d.status.kind === 'out' && d.status.round !== 'Bronze' && ` en ${roundLabel(d.status.round)}`}
            </span>
          </header>
          {d.pool && <PoolLine pool={d.pool} />}
          {d.bouts.length > 0 && (
            <ul className="club-day-bouts">
              {d.bouts.map((b) => (
                <Bout key={b.id} bout={b} />
              ))}
              {d.status.kind === 'qualified' && (
                <li className="club-day-next">
                  <span>Tour suivant</span> <strong>adversaire à déterminer</strong>
                </li>
              )}
            </ul>
          )}
        </article>
      ))}
    </section>
  );
}
