import { useEffect, useRef, useState } from 'react';
import API from '../api';
import ResultsBracket from './ResultsBracket';
import { buildTree } from './bracketTree';
import { stripLabel } from './matchPresentation';
import { MEDALS, cityName, countryName, dateRange, flag, roundName } from './eventResults';
import { LegalLinks } from './LegalPages';
import './Results.css';

// Résultat d'un match (page publique : pas de pronostic personnel).
function PublicMatchDialog({ match, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  return (
    <dialog ref={ref} className="result-dialog" aria-labelledby="public-dialog-title" onClose={onClose}>
      <h2 id="public-dialog-title">{roundName(match.round)}</h2>
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
          {[1, 2].map((n) => (
            <tr key={n} className={match.winner === n ? 'is-win' : ''}>
              <td className="muted">{match[`seed${n}`] ? `(${match[`seed${n}`]})` : ''}</td>
              <td>
                {match[`player${n}`]}{' '}
                {match[`player${n}Country`] && <small className="muted">{match[`player${n}Country`]}</small>}
              </td>
              <td className="result-score">
                {match.resultType === 'MEDICAL_WITHDRAWAL' ? '' : (match[`score${n}`] ?? '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {match.resultType === 'MEDICAL_WITHDRAWAL' && <p>Abandon.</p>}
      {!match.isFinished && !match.winner && <p className="muted">Match à venir.</p>}
      <button type="button" className="button-secondary" onClick={() => ref.current?.close()}>
        Fermer
      </button>
    </dialog>
  );
}

function PublicCompetition({ c }) {
  const [open, setOpen] = useState(null);
  const [showTableau, setShowTableau] = useState(false);
  const hasTree = Boolean(buildTree(c.matches));
  return (
    <section className="result-competition public-competition">
      <h3>{c.name}</h3>
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
        <p className="muted">Podium pas encore publié.</p>
      )}
      {hasTree && (
        <p className="result-actions">
          <button
            type="button"
            className={showTableau ? '' : 'button-secondary'}
            onClick={() => setShowTableau((v) => !v)}
          >
            {showTableau ? 'Masquer le tableau' : 'Voir le tableau'}
          </button>
          {c.sourceUrl && (
            <a href={c.sourceUrl} target="_blank" rel="noreferrer">
              Site officiel
            </a>
          )}
        </p>
      )}
      {showTableau && <ResultsBracket matches={c.matches} onOpen={setOpen} />}
      {open && <PublicMatchDialog match={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

// Page publique d'un tournoi, lisible sans compte : à partager sur les réseaux du club.
export default function PublicTournament({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    API.get(`/public/tournaments/${id}`, { signal: c.signal })
      .then(({ data }) => {
        setData(data);
        document.title = `${data.name} · Pronos Escrime`;
      })
      .catch((e) => !c.signal.aborted && setError(e.response?.data?.error || 'Page indisponible.'));
    return () => c.abort();
  }, [id]);
  return (
    <div className="app-shell redesigned public-page">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Pronos Escrime, accueil">
          <span className="brand-mark">↗</span>pronos<span>escrime</span>
        </a>
        <a className="button-link public-cta" href="/">
          Pronostiquer avec nous
        </a>
      </header>
      <main className="feature-panel">
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p>Chargement…</p>}
        {data && (
          <>
            <p className="eyebrow">TOURNOI</p>
            <h1>{data.name}</h1>
            <p className="muted">
              {[
                data.start && dateRange(data.start, data.end),
                cityName(data.city),
                data.countries.map((c) => `${flag(c)} ${countryName(c)}`.trim()).join(' · '),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {data.leaderboard.length > 0 && (
              <section className="public-leaderboard">
                <h2>Classement des pronostiqueurs</h2>
                <ol>
                  {data.leaderboard.map((r, i) => (
                    <li key={i}>
                      <span className="public-rank">{r.rank}</span>
                      <span>{r.name}</span>
                      <strong>
                        {r.points} pt{r.points > 1 ? 's' : ''}
                      </strong>
                    </li>
                  ))}
                </ol>
                {data.players > data.leaderboard.length && (
                  <p className="muted">{data.players} pronostiqueurs au total.</p>
                )}
              </section>
            )}
            {data.competitions.map((c) => (
              <PublicCompetition key={c.id} c={c} />
            ))}
            <p className="public-join">
              Envie de jouer ? <a href="/">Créez votre compte</a> et pronostiquez les prochaines épreuves.
            </p>
          </>
        )}
      </main>
      <footer className="site-footer">
        <LegalLinks />
      </footer>
    </div>
  );
}
