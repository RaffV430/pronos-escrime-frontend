import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { plural } from './resultPresentation';
import { poolRounds, poolStanding } from './eventResults';
import { FencerLink } from './FencerProfile';
import { usePublicMode } from '../lib/publicMode';
import { closeOnBackdrop } from './dialogBackdrop';

const hasBouts = (pool) => Array.isArray(pool.bouts) && pool.bouts.length === pool.fencers.length;
const signed = (n) => (n > 0 ? `+${n}` : String(n));

// Fenêtre d'un tireur de poule : bilan officiel, puis le pronostic du joueur et ses points.
function FencerDialog({ fencer, pool, onClose }) {
  const publicMode = usePublicMode();
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  const p = fencer.prediction;
  return (
    <dialog
      ref={ref}
      className="result-dialog"
      aria-labelledby="pool-dialog-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <h2 id="pool-dialog-title">{fencer.name}</h2>
      <p className="muted">{pool.name}</p>
      <p>
        Bilan officiel :{' '}
        <strong>
          {fencer.wins ?? '—'} V · {fencer.losses ?? '—'} D · indice{' '}
          {fencer.indicator === null ? '—' : signed(fencer.indicator)}
        </strong>
      </p>
      <p>
        <FencerLink name={fencer.name}>Voir son parcours sur toutes les épreuves</FencerLink>
      </p>
      {!publicMode && (
        <section className="result-mine" aria-label="Mon pronostic">
          <h3>Mon pronostic</h3>
          {p ? (
            <p>
              {p.wins} V · {p.losses} D · indice {signed(p.indicator)}
              {pool.isFinal && (
                <>
                  {' · '}
                  <strong>
                    {p.pointsEarned > 0 ? '+' : ''}
                    {p.pointsEarned} {plural(p.pointsEarned, 'pt')}
                  </strong>
                </>
              )}
            </p>
          ) : (
            <p className="muted">Pas de pronostic sur ce tireur.</p>
          )}
        </section>
      )}
      <button type="button" className="button-secondary" onClick={() => ref.current?.close()}>
        Fermer
      </button>
    </dialog>
  );
}

// Case d'un assaut : « V5 » (victoire 5 touches), « D3 » (défaite, 3 touches données), vide si non tiré.
function Bout({ value }) {
  if (!value) return <td className="pool-bout is-empty" />;
  const win = value[0] === 'V';
  return <td className={`pool-bout ${win ? 'is-win' : 'is-loss'}`}>{win ? value : value.slice(1)}</td>;
}

// Matrice officielle de la poule : chaque ligne donne les assauts d'un tireur contre les autres.
function PoolMatrix({ pool, onOpen }) {
  const fencers = [...pool.fencers].sort((a, b) => a.position - b.position);
  const place = new Map(
    [...fencers]
      .filter((f) => f.wins !== null && f.wins !== undefined)
      .sort(
        (a, b) => b.wins / (b.wins + b.losses || 1) - a.wins / (a.wins + a.losses || 1) || b.indicator - a.indicator,
      )
      .map((f, i) => [f.id, i + 1]),
  );
  return (
    <div className="result-matrix-wrap">
      <table className="result-matrix">
        <caption>{pool.name.replace(/^Tour \d+ · /, '')}</caption>
        <thead>
          <tr>
            <th scope="col">Tireur</th>
            <th scope="col" className="pool-num" />
            {fencers.map((f) => (
              <th key={f.id} scope="col" className="pool-num">
                {f.position}
              </th>
            ))}
            <th scope="col" title="Victoires">
              V
            </th>
            <th scope="col" title="Indice">
              Ind.
            </th>
            <th scope="col" title="Place dans la poule">
              Pl.
            </th>
          </tr>
        </thead>
        <tbody>
          {fencers.map((f, i) => (
            <tr key={f.id}>
              <td>
                <button type="button" className="result-pool-name" onClick={() => onOpen(f)}>
                  {f.name}
                  {f.countryCode && <small className="muted"> {f.countryCode}</small>}
                </button>
              </td>
              <td className="pool-num">{f.position}</td>
              {fencers.map((o, j) =>
                i === j ? (
                  <td key={o.id} className="pool-bout is-self" />
                ) : (
                  <Bout key={o.id} value={pool.bouts[i]?.[j]} />
                ),
              )}
              <td>{f.wins ?? '—'}</td>
              <td>{f.indicator === null || f.indicator === undefined ? '—' : signed(f.indicator)}</td>
              <td>{place.get(f.id) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Poules d'une épreuve, regroupées par tour : classement de chaque poule (victoires, indice).
export default function ResultsPools({ competitionId }) {
  const publicMode = usePublicMode();
  const [pools, setPools] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    (publicMode
      ? API.get(`/public/competitions/${competitionId}/pools`, { signal: c.signal })
      : API.get('/pools', { params: { competitionId }, signal: c.signal })
    )
      .then(({ data }) => setPools(data))
      .catch(() => !c.signal.aborted && setError('Poules indisponibles.'));
    return () => c.abort();
  }, [competitionId, publicMode]);
  if (error) return <p className="muted">{error}</p>;
  if (!pools) return <p className="muted">Chargement…</p>;
  if (!pools.length) return <p className="muted">Aucune poule suivie pour cette épreuve.</p>;
  const rounds = poolRounds(pools);
  return (
    <div className="result-pools">
      {rounds.map((r) => (
        <section key={r.round}>
          {rounds.length > 1 && <h4>Tour {r.round}</h4>}
          {r.pools.some(hasBouts) && (
            <p className="muted result-matrix-legend">
              Chaque ligne se lit de gauche à droite : V = victoire (V4 : victoire à 4 touches), un chiffre seul =
              touches données dans une défaite.
            </p>
          )}
          <div className={`result-pool-grid${r.pools.some(hasBouts) ? ' has-matrix' : ''}`}>
            {r.pools.map((pool) =>
              hasBouts(pool) ? (
                <PoolMatrix key={pool.id} pool={pool} onOpen={(f) => setOpen({ fencer: f, pool })} />
              ) : (
                <table key={pool.id} className="result-pool">
                  <caption>{pool.name.replace(/^Tour \d+ · /, '')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Tireur</th>
                      <th scope="col" title="Victoires">
                        V
                      </th>
                      <th scope="col">Ind.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poolStanding(pool.fencers).map((f) => (
                      <tr key={f.id}>
                        <td>
                          <button
                            type="button"
                            className="result-pool-name"
                            onClick={() => setOpen({ fencer: f, pool })}
                          >
                            {f.name}
                            {f.countryCode && <small className="muted"> {f.countryCode}</small>}
                          </button>
                        </td>
                        <td>{f.wins ?? '—'}</td>
                        <td>{f.indicator === null ? '—' : signed(f.indicator)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
            )}
          </div>
        </section>
      ))}
      {open && <FencerDialog fencer={open.fencer} pool={open.pool} onClose={() => setOpen(null)} />}
    </div>
  );
}
