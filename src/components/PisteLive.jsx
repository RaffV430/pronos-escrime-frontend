import { eventNameFr } from '../lib/eventName';
import { useState } from 'react';
import CrowdTrend from './CrowdTrend';
import { roundLabel, groupMatches } from './matchPresentation';
import { officialLink, pisteMatches, pistePrediction, pisteStatus } from '../lib/pisteLive';

export default function PisteLive({
  matches,
  competition,
  userId,
  ready,
  error,
  stale,
  onPlay,
  initialMatchId = null,
}) {
  const [round, setRound] = useState('');
  const [strip, setStrip] = useState('');
  const [mine, setMine] = useState(false);
  const [selectedId, setSelectedId] = useState(initialMatchId);
  const filtered = pisteMatches(matches, { round, strip, mine, userId });
  const match =
    filtered.find((m) => m.id === selectedId) ||
    filtered.find((m) => !m.isFinished && m.isClosed) ||
    filtered.filter((m) => m.isFinished).at(-1) ||
    filtered[0];
  const { prediction, points } = pistePrediction(match, userId);
  const source = officialLink(match?.sourceUrl || competition?.sourceUrl);
  const strips = [...new Set(matches.map((m) => String(m.strip || '')).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr', { numeric: true }),
  );
  const finished = filtered
    .filter((m) => m.isFinished)
    .slice(-6)
    .reverse();
  return (
    <section className="piste-live" aria-label="Suivi des pistes">
      <header className="piste-live-heading">
        <div>
          <p className="arena-eyebrow">AU BORD DES PISTES</p>
          <h1>Suivi des rencontres</h1>
          <p>{eventNameFr(competition?.name) || 'Choisissez une épreuve'}</p>
        </div>
        <button className="button-secondary" onClick={onPlay}>
          Pronostiquer →
        </button>
      </header>
      <p className="piste-live-notice">
        Résultats actualisés automatiquement depuis le dernier import officiel. Le chrono et le fil des touches ne sont
        pas encore transmis à l’application.
      </p>
      {stale && <p role="status">Connexion interrompue : les dernières données reçues restent affichées.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="piste-live-filters">
        <label>
          Tour
          <select value={round} onChange={(e) => setRound(e.target.value)}>
            <option value="">Tous les tours</option>
            {groupMatches(matches).map((g) => (
              <option key={g.round} value={g.round}>
                {roundLabel(g.round)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Piste
          <select value={strip} onChange={(e) => setStrip(e.target.value)}>
            <option value="">Toutes les pistes</option>
            {strips.map((s) => (
              <option key={s} value={s}>
                Piste {s}
              </option>
            ))}
          </select>
        </label>
        <button className="button-secondary" aria-pressed={mine} onClick={() => setMine(!mine)}>
          Mes pronos seulement
        </button>
      </div>
      {!ready ? (
        <p>Chargement des rencontres…</p>
      ) : !match ? (
        <div className="feature-panel">
          <h2>Aucune rencontre pour ces critères</h2>
          <p>Les affiches apparaîtront dès leur import officiel.</p>
        </div>
      ) : (
        <>
          <article className="piste-live-score" key={match.id}>
            <div className="piste-live-meta">
              <span>
                {roundLabel(match.round)}
                {match.strip ? ` · Piste ${match.strip}` : ''}
              </span>
              <span>{pisteStatus(match)}</span>
            </div>
            <div className="piste-live-duel">
              {[1, 2].map((i) => (
                <div className={`piste-live-athlete lamp-${i}`} key={i}>
                  <span className="arena-avatar">
                    {match[`player${i}`]
                      ?.split(/\s+/)
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join('')}
                  </span>
                  <h2>
                    {match[`player${i}`]}
                    {match[`player${i}Country`] ? ` · ${match[`player${i}Country`]}` : ''}
                  </h2>
                  <strong className="piste-live-score-number">
                    {match.isFinished && Number.isInteger(match[`score${i}`]) ? match[`score${i}`] : '—'}
                  </strong>
                </div>
              ))}
            </div>
            <div className="piste-live-panels">
              <section>
                <p className="arena-eyebrow">VOTRE PRONOSTIC</p>
                <h3>
                  {prediction ? `${prediction.predictedScore1} – ${prediction.predictedScore2}` : 'Non renseigné'}
                </h3>
                <p>
                  {points === null
                    ? 'Les points seront affichés après validation du résultat.'
                    : `${points} ${points > 1 ? 'points gagnés' : 'point gagné'}`}
                </p>
              </section>
              <section>
                <p className="arena-eyebrow">LES CHOIX DES JOUEURS</p>
                {match.crowd?.total ? (
                  <CrowdTrend match={match} />
                ) : (
                  <p>Tendances disponibles après la clôture des pronostics, si des choix ont été enregistrés.</p>
                )}
              </section>
            </div>
            {source && (
              <a href={source} target="_blank" rel="noreferrer">
                Voir le suivi officiel ↗
              </a>
            )}
          </article>
          <div className="piste-live-bottom">
            <section>
              <h2>Les rencontres de l’épreuve</h2>
              <div className="piste-live-grid">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    className="piste-live-tile"
                    aria-pressed={m.id === match.id}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <small>
                      {roundLabel(m.round)}
                      {m.strip ? ` · Piste ${m.strip}` : ''} · {pisteStatus(m)}
                    </small>
                    <span>
                      {m.player1}
                      <b>{m.isFinished ? (m.score1 ?? '—') : '—'}</b>
                    </span>
                    <span>
                      {m.player2}
                      <b>{m.isFinished ? (m.score2 ?? '—') : '—'}</b>
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <aside className="feature-panel">
              <h2>Derniers résultats</h2>
              {finished.length ? (
                finished.map((m) => {
                  const p = pistePrediction(m, userId);
                  return (
                    <div className="piste-live-result" key={`${m.id}:${p.points}`}>
                      <strong>
                        {m.player1} / {m.player2}
                      </strong>
                      <p>
                        {roundLabel(m.round)} · {m.score1 ?? '—'} – {m.score2 ?? '—'}
                      </p>
                      {p.points !== null && (
                        <b className="piste-live-points">
                          +{p.points} {p.points > 1 ? 'points' : 'point'}
                        </b>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>Les résultats publiés apparaîtront ici.</p>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
