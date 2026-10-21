import { useEffect, useState } from 'react';
import API from '../api';
import { plural } from './resultPresentation';
import './podium-overview.css';

const PLACE = { gold: '1er', silver: '2e', bronze1: '3e', bronze2: '3e' };
const STATUS = { exact: 'bonne place', podium: 'sur le podium, autre place', miss: 'hors podium' };

// Onglet « Podium » des Classements : pronostics de podium de chacun, épreuve par épreuve, rangés par tournoi.
// Ceux des autres joueurs ne sont visibles qu'une fois les pronostics de podium clos (le serveur y veille).
export default function PodiumOverview({ userId, revision = 0 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError('');
    API.get('/podium/overview', { signal: c.signal })
      .then(({ data }) => !c.signal.aborted && setData(Array.isArray(data) ? data : []))
      .catch((e) => !c.signal.aborted && setError(e.response?.data?.error || 'Podiums indisponibles. Réessayez.'));
    return () => c.abort();
  }, [revision]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Chargement des podiums…</p>;
  if (!data.length) return <p>Aucun pronostic de podium pour l’instant.</p>;
  return (
    <div className="podium-overview">
      {data.map((t, ti) => (
        <details key={t.id} className="po-tournament" open={ti === 0}>
          <summary>
            <strong>{t.name}</strong>
            <small>
              {t.competitions.length} épreuve{t.competitions.length > 1 ? 's' : ''}
            </small>
          </summary>
          {t.competitions.map((c, ci) => (
            <details key={c.id} className="po-event" open={ti === 0 && ci === 0}>
              <summary>
                <span>{c.name}</span>
                <small>
                  {c.players} {plural(c.players, 'joueur')}
                  {c.closed ? '' : ' · pronostics ouverts'}
                </small>
              </summary>
              {c.official ? (
                <p className="po-official">
                  <span>Podium officiel</span>
                  {c.official.map((o, i) => (
                    <span key={i} className="po-chip is-official">
                      {PLACE[o.slot]} {o.name}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="muted">
                  {c.closed
                    ? 'Podium officiel en attente des résultats définitifs.'
                    : 'Les podiums des autres joueurs seront visibles à la clôture des pronostics.'}
                </p>
              )}
              <ul className="po-players">
                {c.predictions.map((p) => (
                  <li key={p.userId} className={p.userId === userId ? 'is-me' : ''}>
                    <div className="po-player-head">
                      <strong>
                        {p.name}
                        {p.userId === userId ? ' · vous' : ''}
                      </strong>
                      {p.points !== null && (
                        <b>
                          {p.points} {plural(p.points, 'pt', 'pts')}
                        </b>
                      )}
                    </div>
                    <div className="po-picks">
                      {p.picks.map((k) => (
                        <span
                          key={k.slot}
                          className={`po-chip${k.status ? ` is-${k.status}` : ''}`}
                          title={k.status ? STATUS[k.status] : undefined}
                        >
                          {PLACE[k.slot]} {k.name}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </details>
      ))}
      <p className="muted po-legend">
        <span className="po-chip is-exact">bonne place</span> <span className="po-chip is-podium">sur le podium</span>{' '}
        <span className="po-chip is-miss">hors podium</span>
      </p>
    </div>
  );
}
