import { useEffect, useMemo, useState } from 'react';
import API from '../api';
import { roundLabel } from './matchPresentation';
import { plural } from './resultPresentation';
import { SEASON_FILTERS, OUTCOME_LABELS, filterSeason, signedPoints } from './seasonPresentation';
import './MySeason.css';

const dateLabel = (value) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export default function MySeason({ userId }) {
  const [season, setSeason] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    API.get('/me/season', { params: season === null ? {} : { season }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setData(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.response?.data?.error || 'Chargement impossible. Réessayez.');
      });
    return () => controller.abort();
  }, [season, userId, revision]);

  const tournaments = useMemo(() => filterSeason(data?.tournaments, filter, query), [data, filter, query]);
  const totals = data?.totals;
  const stats = data?.stats;

  return (
    <section className="feature-panel season-panel">
      <div className="feature-heading">
        <div>
          <p className="eyebrow">MA SAISON</p>
          <h1>{data ? `Saison ${data.label}` : 'Ma saison'}</h1>
        </div>
        {data?.seasons?.length > 1 && (
          <label className="season-select">
            Saison
            <select value={data.season} onChange={(e) => setSeason(Number(e.target.value))}>
              {data.seasons.map((s) => (
                <option key={s.season} value={s.season}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="muted">Tous vos pronostics du 1er septembre au 31 août, avec le détail des points.</p>
      {error && (
        <p role="alert">
          {error}{' '}
          <button className="button-secondary" onClick={() => setRevision((n) => n + 1)}>
            Réessayer
          </button>
        </p>
      )}
      {!data && !error && <p>Chargement…</p>}
      {data && (
        <>
          <div className="stat-grid season-stats">
            <p>
              <strong>{totals.total}</strong> {plural(totals.total, 'point')} sur la saison
            </p>
            <p>
              <strong>
                {stats.winners} / {stats.matchesPlayed}
              </strong>{' '}
              {plural(stats.winners, 'vainqueur trouvé', 'vainqueurs trouvés')}
              {stats.accuracy !== null && ` (${stats.accuracy}\u00a0%)`}
            </p>
            <p>
              <strong>{stats.exact}</strong> {plural(stats.exact, 'score exact', 'scores exacts')}
            </p>
            <p>
              <strong>{stats.predictions}</strong> {plural(stats.predictions, 'pronostic')}
              {stats.pending > 0 && ` · ${stats.pending} en attente`}
            </p>
          </div>
          <p className="season-breakdown">
            Matchs {totals.match}
            {totals.outsider > 0 && ` · Bonus outsider ${totals.outsider}`} · Poules {totals.pool} · Podiums{' '}
            {totals.podium} · Défis {totals.challenge}
            {totals.adjustment !== 0 && ` · Ajustements ${signedPoints(totals.adjustment)}`}
          </p>

          <div className="season-tools">
            <div className="filter-row" role="group" aria-label="Filtrer les pronostics">
              {SEASON_FILTERS.map(([id, label]) => (
                <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="season-search">
              Rechercher un tireur
              <input
                type="search"
                value={query}
                placeholder="Nom du tireur ou de l’équipe"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          {!data.tournaments.length && <p>Aucun pronostic sur cette saison pour l’instant.</p>}
          {data.tournaments.length > 0 && !tournaments.length && (
            <p>Aucun pronostic ne correspond à cette sélection.</p>
          )}

          {tournaments.map((t, index) => (
            <details key={t.id} className="season-tournament" open={index === 0 || filter !== 'all' || !!query}>
              <summary>
                <span>
                  <strong>{t.name}</strong>
                  <small>
                    {dateLabel(t.date)}
                    {t.archived ? ' · Archivé' : ''}
                  </small>
                </span>
                <span className="season-points">
                  {t.points} {plural(t.points, 'pt')}
                </span>
              </summary>
              {t.competitions.map((c) => (
                <div key={c.id} className="season-competition">
                  <h3>
                    {c.name}
                    <span className="season-points">
                      {c.points} {plural(c.points, 'pt')}
                    </span>
                  </h3>
                  <ul className="season-rows">
                    {c.rows.map((r) => (
                      <li key={r.key} className={`season-row outcome-${r.outcome}`}>
                        <div className="season-row-name">
                          <strong>{r.name}</strong>
                          <small>
                            {r.type}
                            {r.round && ` · ${roundLabel(r.round)}`}
                          </small>
                        </div>
                        <div>
                          <small>Pronostic</small>
                          <span>{r.prediction || '—'}</span>
                        </div>
                        <div>
                          <small>Résultat</small>
                          <span>{r.result || 'En attente'}</span>
                        </div>
                        <div className="season-row-points">
                          <span className="season-outcome">{OUTCOME_LABELS[r.outcome]}</span>
                          <strong>{r.points === null ? '—' : signedPoints(r.points)}</strong>
                          {r.details.length > 0 && <small>{r.details.join(' · ')}</small>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          ))}

          {data.adjustments.length > 0 && filter === 'all' && !query && (
            <div className="season-competition">
              <h3>Ajustements de l’organisation</h3>
              <ul className="season-rows">
                {data.adjustments.map((a) => (
                  <li key={a.id} className="season-row season-adjustment">
                    <div className="season-row-name">
                      <strong>{a.reason || 'Ajustement de points'}</strong>
                      <small>{dateLabel(a.date)}</small>
                    </div>
                    <div className="season-row-points">
                      <strong>{signedPoints(a.points)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
