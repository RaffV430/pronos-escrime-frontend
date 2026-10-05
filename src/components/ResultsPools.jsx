import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { plural } from './resultPresentation';
import { poolRounds, poolStanding } from './eventResults';

const signed = (n) => (n > 0 ? `+${n}` : String(n));

// Fenêtre d'un tireur de poule : bilan officiel, puis le pronostic du joueur et ses points.
function FencerDialog({ fencer, pool, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  const p = fencer.prediction;
  return (
    <dialog ref={ref} className="result-dialog" aria-labelledby="pool-dialog-title" onClose={onClose}>
      <h2 id="pool-dialog-title">{fencer.name}</h2>
      <p className="muted">{pool.name}</p>
      <p>
        Bilan officiel :{' '}
        <strong>
          {fencer.wins ?? '—'} V · {fencer.losses ?? '—'} D · indice{' '}
          {fencer.indicator === null ? '—' : signed(fencer.indicator)}
        </strong>
      </p>
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
      <button type="button" className="button-secondary" onClick={() => ref.current?.close()}>
        Fermer
      </button>
    </dialog>
  );
}

// Poules d'une épreuve, regroupées par tour : classement de chaque poule (victoires, indice).
export default function ResultsPools({ competitionId }) {
  const [pools, setPools] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    API.get('/pools', { params: { competitionId }, signal: c.signal })
      .then(({ data }) => setPools(data))
      .catch(() => !c.signal.aborted && setError('Poules indisponibles.'));
    return () => c.abort();
  }, [competitionId]);
  if (error) return <p className="muted">{error}</p>;
  if (!pools) return <p className="muted">Chargement…</p>;
  if (!pools.length) return <p className="muted">Aucune poule suivie pour cette épreuve.</p>;
  const rounds = poolRounds(pools);
  return (
    <div className="result-pools">
      {rounds.map((r) => (
        <section key={r.round}>
          {rounds.length > 1 && <h4>Tour {r.round}</h4>}
          <div className="result-pool-grid">
            {r.pools.map((pool) => (
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
                        <button type="button" className="result-pool-name" onClick={() => setOpen({ fencer: f, pool })}>
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
            ))}
          </div>
        </section>
      ))}
      {open && <FencerDialog fencer={open.fencer} pool={open.pool} onClose={() => setOpen(null)} />}
    </div>
  );
}
