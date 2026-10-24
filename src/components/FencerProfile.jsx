import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import API from '../api';
import { roundName } from './eventResults';
import { closeOnBackdrop, nestedDialogLayer } from './dialogBackdrop';
import './Results.css';

const signed = (n) => (n > 0 ? `+${n}` : String(n));
const day = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const touches = (b) => (b.given !== null && b.received !== null ? `${b.given}–${b.received}` : '');
const bilan = (w, l) => `${w} V – ${l} D`;

export function Competition({ c, open, matchId }) {
  return (
    <details className="fp-competition" open={open}>
      <summary>
        <span>
          <strong>{c.tournament}</strong>
          <small>{[c.competition, !c.detailMissing && day(c.date)].filter(Boolean).join(' · ')}</small>
        </span>
        {c.result ? (
          <span className="fp-result">
            {c.result.round ? `Éliminé · ${roundName(c.result.round).toLowerCase()}` : c.result.label}
          </span>
        ) : (
          c.detailMissing && <span className="fp-result muted">Engagé</span>
        )}
      </summary>
      {c.detailMissing && (
        <p className="fp-block muted">
          Épreuve connue par la liste officielle des engagés : le détail des poules et du tableau n’est pas disponible
          dans l’application.
        </p>
      )}
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
                  <span className="fp-mark">{b.won ? 'V' : 'D'}</span>
                  <span className="fp-score">{touches(b)}</span>
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
                <span className="fp-score">{m.medical ? 'abandon' : m.score ? `${m.score[0]}–${m.score[1]}` : ''}</span>
                <span className="fp-opponent">
                  {m.opponent}
                  {m.opponentCountry && <small className="muted"> {m.opponentCountry}</small>}
                </span>{' '}
                <small className="muted fp-round">{roundName(m.round)}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </details>
  );
}

// Fiche d'un tireur : son parcours dans toutes les épreuves suivies par l'application.
// competitionId : épreuve d'où la fiche est ouverte (onglet Podium) — affichée en premier et dépliée.
export default function FencerProfile({
  name,
  affiliationId = null,
  onClose,
  matchId = null,
  competitionId = null,
  currentOnly = false,
  parentDialog = null,
  onPageBackdrop = null,
}) {
  const ref = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  // Homonymes d'une même épreuve (clubs différents) : une fiche par club. Ouverte depuis un match, le
  // serveur retrouve le club du tireur dans ce match ; sinon, choix du club.
  // undefined : club déduit du match ; null : choix demandé ; texte : club choisi.
  const [club, setClub] = useState(undefined);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError('');
    API.get('/public/fencer', {
      params: { name, ...(affiliationId ? { affiliationId } : {}), ...(club ? { club } : club === undefined && matchId ? { matchId } : {}) },
      signal: c.signal,
    })
      .then(({ data }) => setData(data))
      .catch((e) => !c.signal.aborted && setError(e.response?.data?.error || 'Fiche indisponible.'));
    return () => c.abort();
  }, [name, affiliationId, club, matchId]);
  const s = data?.summary;
  return (
    <dialog
      ref={ref}
      className="result-dialog fencer-profile"
      aria-labelledby="fencer-profile-title"
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (parentDialog?.current && e.target === e.currentTarget) {
          const layer = nestedDialogLayer(
            { x: e.clientX, y: e.clientY },
            e.currentTarget.getBoundingClientRect(),
            parentDialog.current.getBoundingClientRect(),
          );
          if (layer === 'parent') e.currentTarget.close();
          else if (layer === 'page') {
            e.currentTarget.close();
            onPageBackdrop?.();
          }
        } else closeOnBackdrop(e);
        e.stopPropagation(); // la carte du match sous la fenêtre ne doit pas réagir
      }}
    >
      <h2 id="fencer-profile-title">
        {data?.name || name} {data?.country && <small className="muted">{data.country}</small>}
      </h2>
      {error && <p className="muted">{error}</p>}
      {!data && !error && <p className="muted">Chargement…</p>}
      {data?.homonyms?.length > 0 && (
        <div className="fp-homonyms">
          <p className="muted">
            Plusieurs tireurs portent ce nom dans une même épreuve. Choisissez son club pour voir son parcours :
          </p>
          <div className="fp-homonym-choices">
            {data.homonyms.map((h) => (
              <button key={h.club} type="button" className="button-secondary" onClick={() => setClub(h.club)}>
                {h.club}
                <small className="muted">
                  {' '}
                  · {h.competitions} épreuve{h.competitions > 1 ? 's' : ''}
                </small>
              </button>
            ))}
          </div>
        </div>
      )}
      {data?.homonymsSplit && (
        <p className="muted">
          Un homonyme d’un autre club a sa propre fiche.{' '}
          <button type="button" className="fencer-link" onClick={() => setClub(null)}>
            Voir les autres clubs
          </button>
        </p>
      )}
      {currentOnly &&
        data &&
        !data.homonyms?.length &&
        !data.competitions.some((c) => c.competitionId === competitionId) && (
          <p className="muted">Aucun parcours publié et identifié pour ce tireur dans cette compétition.</p>
        )}
      {data && !data.homonyms?.length && (
        <>
          <p className="muted">
            {currentOnly
              ? 'Parcours dans cette compétition'
              : s.competitions
                ? [
                    `${s.competitions} épreuve${s.competitions > 1 ? 's' : ''} suivie${s.competitions > 1 ? 's' : ''}`,
                    s.poolWins + s.poolLosses ? `poules ${bilan(s.poolWins, s.poolLosses)}` : null,
                    s.tableauWins + s.tableauLosses ? `tableau ${bilan(s.tableauWins, s.tableauLosses)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Aucune épreuve suivie pour ce tireur.'}
          </p>
          {(currentOnly
            ? data.competitions.filter((c) => c.competitionId === competitionId)
            : competitionId
              ? [
                  ...data.competitions.filter((c) => c.competitionId === competitionId),
                  ...data.competitions.filter((c) => c.competitionId !== competitionId),
                ]
              : data.competitions
          ).map((c, i) => (
            <Competition
              key={c.competitionId}
              c={c}
              matchId={matchId}
              open={
                currentOnly
                  ? c.competitionId === competitionId
                  : matchId
                    ? c.tableau.some((m) => m.matchId === matchId)
                    : competitionId
                      ? c.competitionId === competitionId
                      : i === 0
              }
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
export function FencerLink({ name, children, className = '', matchId = null, competitionId = null }) {
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
        createPortal(
          <FencerProfile name={name} matchId={matchId} competitionId={competitionId} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}
