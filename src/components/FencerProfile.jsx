import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import API from '../api';
import { roundName } from './eventResults';
import { closeOnBackdrop } from './dialogBackdrop';
import './Results.css';

const signed = (n) => (n > 0 ? `+${n}` : String(n));
const day = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const touches = (b) => (b.given !== null && b.received !== null ? `${b.given}–${b.received}` : '');
const bilan = (w, l) => `${w} V – ${l} D`;

function Competition({ c, open, matchId }) {
  return (
    <details className="fp-competition" open={open}>
      <summary>
        <span>
          <strong>{c.tournament}</strong>
          <small>{[c.competition, day(c.date)].filter(Boolean).join(' · ')}</small>
        </span>
        {c.result && (
          <span className="fp-result">
            {c.result.round ? `Éliminé · ${roundName(c.result.round).toLowerCase()}` : c.result.label}
          </span>
        )}
      </summary>
      {c.pools.map((p) => (
        <section key={p.poolId} className="fp-block">
          <h4>
            {p.pool.replace(/^Tour (\d+) · /, 'Tour $1 · ')} ·{' '}
            {p.wins === null ? 'bilan non publié' : `${bilan(p.wins, p.losses)} · indice ${signed(p.indicator)}`}
            {p.place ? ` · ${p.place}${p.place === 1 ? 'er' : 'e'}/${p.size}` : ''}
          </h4>
          {p.bouts.length > 0 && (
            <ul className="fp-bouts">
              {p.bouts.map((b, i) => (
                <li key={i} className={b.won ? 'is-win' : 'is-loss'}>
                  <span className="fp-mark">{b.won ? 'V' : 'D'}</span> {touches(b)}{' '}
                  <span className="fp-opponent">
                    {b.opponent}
                    {b.country && <small className="muted"> {b.country}</small>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {c.tableau.length > 0 && (
        <section className="fp-block">
          <h4>Tableau</h4>
          <ul className="fp-bouts">
            {c.tableau.map((m) => (
              <li
                key={m.matchId}
                className={`${m.won ? 'is-win' : 'is-loss'}${m.matchId === matchId ? ' is-current' : ''}`}
              >
                <span className="fp-mark">{m.won ? 'V' : 'D'}</span>{' '}
                {m.medical ? 'abandon' : m.score ? `${m.score[0]}–${m.score[1]}` : ''}{' '}
                <span className="fp-opponent">
                  {m.opponent}
                  {m.opponentCountry && <small className="muted"> {m.opponentCountry}</small>}
                </span>{' '}
                <small className="muted">{roundName(m.round)}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </details>
  );
}

// Fiche d'un tireur : son parcours dans toutes les épreuves suivies par l'application.
export default function FencerProfile({ name, onClose, matchId = null }) {
  const ref = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    API.get('/public/fencer', { params: { name }, signal: c.signal })
      .then(({ data }) => setData(data))
      .catch((e) => !c.signal.aborted && setError(e.response?.data?.error || 'Fiche indisponible.'));
    return () => c.abort();
  }, [name]);
  const s = data?.summary;
  return (
    <dialog
      ref={ref}
      className="result-dialog fencer-profile"
      aria-labelledby="fencer-profile-title"
      onClose={onClose}
      onClick={(e) => {
        closeOnBackdrop(e);
        e.stopPropagation(); // la carte du match sous la fenêtre ne doit pas réagir
      }}
    >
      <h2 id="fencer-profile-title">
        {data?.name || name} {data?.country && <small className="muted">{data.country}</small>}
      </h2>
      {error && <p className="muted">{error}</p>}
      {!data && !error && <p className="muted">Chargement…</p>}
      {data && (
        <>
          <p className="muted">
            {s.competitions
              ? [
                  `${s.competitions} épreuve${s.competitions > 1 ? 's' : ''} suivie${s.competitions > 1 ? 's' : ''}`,
                  s.poolWins + s.poolLosses ? `poules ${bilan(s.poolWins, s.poolLosses)}` : null,
                  s.tableauWins + s.tableauLosses ? `tableau ${bilan(s.tableauWins, s.tableauLosses)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Aucune épreuve suivie pour ce tireur.'}
          </p>
          {data.competitions.map((c, i) => (
            <Competition
              key={c.competitionId}
              c={c}
              matchId={matchId}
              open={matchId ? c.tableau.some((m) => m.matchId === matchId) : i === 0}
            />
          ))}
        </>
      )}
      <button type="button" className="button-secondary" onClick={() => ref.current?.close()}>
        Fermer
      </button>
    </dialog>
  );
}

// Nom cliquable qui ouvre la fiche du tireur.
export function FencerLink({ name, children, className = '', matchId = null }) {
  const [open, setOpen] = useState(false);
  if (!name?.trim()) return children || null;
  return (
    <>
      <button
        type="button"
        className={`fencer-link ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`Fiche de ${name}`}
      >
        {children || name}
      </button>
      {/* Fenêtre attachée à la page, pas au texte cliqué : elle n'hérite d'aucun style (gras du vainqueur…). */}
      {open &&
        createPortal(<FencerProfile name={name} matchId={matchId} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
