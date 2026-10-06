import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../api';
import { groupMatches, stripLabel } from './matchPresentation';
import { matchTotal, plural } from './resultPresentation';
import {
  MEDALS,
  cityName,
  roundName,
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
import ResultsBracket from './ResultsBracket';
import ResultsPools from './ResultsPools';
import { FencerLink } from './FencerProfile';
import { buildTree } from './bracketTree';
import { usePublicMode } from '../lib/publicMode';
import './Results.css';
import { closeOnBackdrop } from './dialogBackdrop';

const place = (codes) => (codes || []).map((c) => `${flag(c)} ${countryName(c)}`.trim()).join(' · ');

// Fenêtre d'un match : résultat officiel, puis, à la demande, le pronostic du joueur et ses points.
function MatchDialog({ match, onClose }) {
  const publicMode = usePublicMode();
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
    <dialog
      ref={ref}
      className="result-dialog"
      aria-labelledby="result-dialog-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <h2 id="result-dialog-title">{roundName(match.round)}</h2>
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
                  <FencerLink name={s.name} /> {s.country && <small className="muted">{s.country}</small>}
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
      {!publicMode && (
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
      )}
      <button type="button" className="button-secondary" onClick={() => ref.current?.close()}>
        Fermer
      </button>
    </dialog>
  );
}

// Tableau d'une épreuve : tours du premier à la finale, un match par ligne (vainqueur en premier).
function CompetitionMatches({ competitionId }) {
  const publicMode = usePublicMode();
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    (publicMode
      ? API.get(`/public/competitions/${competitionId}/matches`, { signal: c.signal })
      : API.get('/matches', { params: { competitionId }, signal: c.signal })
    )
      .then(({ data }) => setMatches(playedMatches(data)))
      .catch(() => !c.signal.aborted && setError('Tableau indisponible.'));
    return () => c.abort();
  }, [competitionId, publicMode]);
  if (error) return <p className="muted">{error}</p>;
  if (!matches) return <p className="muted">Chargement…</p>;
  if (!matches.length) return <p className="muted">Aucun match de tableau suivi pour cette épreuve.</p>;
  if (buildTree(matches))
    return (
      <>
        <ResultsBracket matches={matches} onOpen={setOpen} />
        {open && <MatchDialog match={open} onClose={() => setOpen(null)} />}
      </>
    );
  // Positions officielles inconnues (anciennes épreuves) : liste par tour.
  return (
    <div className="result-rounds">
      {groupMatches(matches).map((g) => (
        <section key={g.round}>
          <h4>{roundName(g.round)}</h4>
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
  const [view, setView] = useState(null); // null | 'tableau' | 'pools'
  const toggle = (v) => setView((current) => (current === v ? null : v));
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
          className={view === 'tableau' ? '' : 'button-secondary'}
          aria-expanded={view === 'tableau'}
          onClick={() => toggle('tableau')}
        >
          Tableau
        </button>
        <button
          type="button"
          className={view === 'pools' ? '' : 'button-secondary'}
          aria-expanded={view === 'pools'}
          onClick={() => toggle('pools')}
        >
          Poules
        </button>
        {c.sourceUrl && (
          <a href={c.sourceUrl} target="_blank" rel="noreferrer">
            Site officiel
          </a>
        )}
      </p>
      {view === 'tableau' && <CompetitionMatches competitionId={c.id} />}
      {view === 'pools' && <ResultsPools competitionId={c.id} />}
    </div>
  );
}

// Lien vers la page publique du tournoi (sans compte), à partager sur les réseaux du club.
function PublicLink({ tournament }) {
  const [copied, setCopied] = useState(false);
  const url = `${location.origin}/tournoi/${tournament.id}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: tournament.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      /* partage annulé */
    }
  };
  return (
    <p className="result-public">
      <a href={url} target="_blank" rel="noreferrer">
        Page publique du tournoi
      </a>{' '}
      <button type="button" className="button-link" onClick={share}>
        {copied ? 'Lien copié' : 'Partager'}
      </button>
    </p>
  );
}

export default function Results() {
  const publicMode = usePublicMode();
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
    API.get(publicMode ? '/public/results' : '/results', { signal: c.signal })
      .then(({ data }) => setData(data))
      .catch((e) => !c.signal.aborted && setError(e.response?.data?.error || 'Chargement impossible. Réessayez.'));
    return () => c.abort();
  }, [revision, publicMode]);

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
        Podiums, tableaux et poules des tournois passés. Touchez un match ou un tireur pour voir le résultat
        {publicMode ? ' et le parcours de chaque tireur.' : ' et, si vous l’aviez pronostiqué, vos points.'}
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
                  <small>
                    {[dateRange(t.start, t.end), cityName(t.city), place(t.countries)].filter(Boolean).join(' · ')}
                  </small>
                </span>
              </summary>
              {t.competitions.map((c) => (
                <Competition key={c.id} c={c} tournament={t} />
              ))}
              <PublicLink tournament={t} />
            </details>
          ))}
        </>
      )}
    </section>
  );
}
