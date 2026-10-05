import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../api';
import { groupMatches, roundLabel, stripLabel } from './matchPresentation';
import { matchTotal, plural } from './resultPresentation';
import {
  MEDALS,
  countriesOf,
  countryName,
  dateRange,
  filterResults,
  flag,
  playedMatches,
  resultText,
  seasonLabel,
  seasonsOf,
} from './eventResults';
import './Results.css';

const place = (codes) => (codes || []).map((c) => `${flag(c)} ${countryName(c)}`.trim()).join(' · ');

// Fenêtre d'un match : résultat officiel, puis, à la demande, le pronostic du joueur et ses points.
function MatchDialog({ match, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);
  const p = match.predictions?.[0];
  const total = matchTotal(p);
  const side = (n) => ({
    name: match[`player${n}`],
    country: match[`player${n}Country`],
    seed: match[`seed${n}`],
    won: match.winner === n,
    score: match[`score${n}`],
  });
  return (
    <dialog ref={ref} className="result-dialog" aria-labelledby="result-dialog-title" onClose={onClose}>
      <h2 id="result-dialog-title">{roundLabel(match.round)}</h2>
      <p className="muted">
        {[
          match.startsAt &&
            new Date(match.startsAt).toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            }),
          match.strip && stripLabel(match.strip),
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <table className="result-duel">
        <tbody>
          {[1, 2].map((n) => {
            const s = side(n);
            return (
              <tr key={n} className={s.won ? 'is-win' : ''}>
                <td className="muted">{s.seed ? `(${s.seed})` : ''}</td>
                <td>
                  {s.name} {s.country && <small className="muted">{s.country}</small>}
                </td>
                <td className="result-score">{match.resultType === 'MEDICAL_WITHDRAWAL' ? '' : (s.score ?? '')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {match.resultType === 'MEDICAL_WITHDRAWAL' && (
        <p>Abandon : {match.winner === 1 ? match.player1 : match.player2} qualifié(e).</p>
      )}
      {match.pointsPending && <p className="muted">Résultat en cours de vérification.</p>}
      <section className="result-mine" aria-label="Mon pronostic">
        <h3>Mon pronostic</h3>
        {p ? (
          <p>
            {p.predictedScore1}–{p.predictedScore2}
            {!match.pointsPending && (
              <>
                {' · '}
                <strong>
                  {total > 0 ? '+' : ''}
                  {total} {plural(total, 'pt')}
                </strong>
                {p.bonusPoints > 0 && <small className="muted"> dont {p.bonusPoints} de bonus outsider</small>}
              </>
            )}
          </p>
        ) : (
          <p className="muted">Pas de pronostic sur ce match.</p>
        )}
      </section>
      <button type="button" className="button-secondary" onClick={() => ref.current?.close()}>
        Fermer
      </button>
    </dialog>
  );
}

// Tableau d'une épreuve : tours du premier à la finale, un match par ligne (vainqueur en premier).
function CompetitionMatches({ competitionId }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    API.get('/matches', { params: { competitionId }, signal: c.signal })
      .then(({ data }) => setMatches(playedMatches(data)))
      .catch(() => !c.signal.aborted && setError('Tableau indisponible.'));
    return () => c.abort();
  }, [competitionId]);
  if (error) return <p className="muted">{error}</p>;
  if (!matches) return <p className="muted">Chargement…</p>;
  if (!matches.length) return <p className="muted">Aucun match de tableau suivi pour cette épreuve.</p>;
  return (
    <div className="result-rounds">
      {groupMatches(matches).map((g) => (
        <section key={g.round}>
          <h4>{roundLabel(g.round)}</h4>
          <ul>
            {g.items.map((m) => {
              const w = m.winner === 2 ? 2 : 1;
              const l = 3 - w;
              return (
                <li key={m.id}>
                  <button type="button" className="result-match" onClick={() => setOpen(m)}>
                    <span className="is-win">{m[`player${w}`]}</span>
                    <span className="result-score">{resultText(m) || '—'}</span>
                    <span>{m[`player${l}`]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {open && <MatchDialog match={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Competition({ c, tournament }) {
  const [showMatches, setShowMatches] = useState(false);
  return (
    <div className="result-competition">
      <h3>
        {c.name}
        {tournament.start !== tournament.end && <small> · {dateRange(c.date)}</small>}
      </h3>
      {c.podium.length ? (
        <ol className="result-podium">
          {c.podium.map((p, i) => (
            <li key={i}>
              <span aria-label={`${p.place}${p.place === 1 ? 're' : 'e'} place`}>{MEDALS[p.place]}</span> {p.name}
              {p.country && <small className="muted"> {p.country}</small>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Podium officiel non publié.</p>
      )}
      <p className="result-actions">
        <button
          type="button"
          className="button-secondary"
          aria-expanded={showMatches}
          onClick={() => setShowMatches((v) => !v)}
        >
          {showMatches ? 'Masquer le tableau' : 'Voir le tableau'}
        </button>
        {c.sourceUrl && (
          <a href={c.sourceUrl} target="_blank" rel="noreferrer">
            Classement sur le site officiel
          </a>
        )}
      </p>
      {showMatches && <CompetitionMatches competitionId={c.id} />}
    </div>
  );
}

export default function Results() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [season, setSeason] = useState(null);
  const [country, setCountry] = useState('all');
  const [order, setOrder] = useState('desc');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const c = new AbortController();
    setError('');
    API.get('/results', { signal: c.signal })
      .then(({ data }) => setData(data))
      .catch((e) => !c.signal.aborted && setError(e.response?.data?.error || 'Chargement impossible. Réessayez.'));
    return () => c.abort();
  }, [revision]);

  const seasons = useMemo(() => seasonsOf(data), [data]);
  const countries = useMemo(() => countriesOf(data), [data]);
  const shownSeason = season ?? (seasons[0] !== undefined ? String(seasons[0]) : 'all');
  const list = useMemo(
    () => filterResults(data, { season: shownSeason, country, order, query }),
    [data, shownSeason, country, order, query],
  );

  return (
    <section className="feature-panel results-panel">
      <div className="feature-heading">
        <div>
          <p className="eyebrow">RÉSULTATS</p>
          <h1>Résultats des épreuves</h1>
        </div>
      </div>
      <p className="muted">
        Podiums et tableaux des tournois passés. Touchez un match pour voir le résultat et, si vous l’aviez pronostiqué,
        vos points.
      </p>
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
          <div className="results-filters">
            <label>
              Saison
              <select value={shownSeason} onChange={(e) => setSeason(e.target.value)}>
                <option value="all">Toutes</option>
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {seasonLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pays
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="all">Tous</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {`${flag(c)} ${countryName(c)}`.trim()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <select value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="desc">Plus récents d’abord</option>
                <option value="asc">Plus anciens d’abord</option>
              </select>
            </label>
            <label className="results-search">
              Rechercher
              <input
                type="search"
                value={query}
                placeholder="Tournoi, ville ou médaillé"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {!data.length && <p>Aucun tournoi terminé pour l’instant.</p>}
          {data.length > 0 && !list.length && <p>Aucun tournoi ne correspond à cette sélection.</p>}
          {list.map((t, index) => (
            <details key={t.id} className="result-tournament" open={index === 0 || !!query}>
              <summary>
                <span>
                  <strong>{t.name}</strong>
                  <small>{[dateRange(t.start, t.end), t.city, place(t.countries)].filter(Boolean).join(' · ')}</small>
                </span>
              </summary>
              {t.competitions.map((c) => (
                <Competition key={c.id} c={c} tournament={t} />
              ))}
            </details>
          ))}
        </>
      )}
    </section>
  );
}
