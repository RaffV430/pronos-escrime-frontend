import { plural, roundStatus, filterPredictionRows } from './resultPresentation';
import { roundLabel } from './matchPresentation';
import { useState, useEffect } from 'react';
import API from '../api';
import TournamentShare from './TournamentShare';
export default function MyPredictions({ competitionId, tournamentId, userId, onNavigate }) {
  const [data, setData] = useState(null),
    [summary, setSummary] = useState(null),
    [filter, setFilter] = useState('Tous'),
    [selectedRound, setSelectedRound] = useState(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [progress, setProgress] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      API.get(`/me/predictions?competitionId=${competitionId}`, { signal: controller.signal }),
      API.get(`/me/summary/${tournamentId}`, { signal: controller.signal }),
    ])
      .then(([a, b]) => {
        if (controller.signal.aborted) return;
        setData(a.data);
        setSummary(b.data);
        setError('');
        setProgress(b.data.progress || null);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.response?.data?.error || 'Chargement impossible. Réessayez.');
      });
    return () => controller.abort();
  }, [competitionId, tournamentId, userId, revision]);
  const openRound = (round) => {
    setSelectedRound(round);
    setFilter('Tous');
    requestAnimationFrame(() => document.getElementById('round-results')?.focus());
  };
  const rows = data?.rows || [],
    activeRows = rows.filter((r) => r.status !== 'Annulé'),
    saved = activeRows.filter((r) => r.prediction).length;
  return (
    <section className="feature-panel">
      <div className="feature-heading">
        <div>
          <p className="eyebrow">VOTRE CARNET DE JEU</p>
          <h1>Tout retrouver, simplement.</h1>
        </div>
        <button onClick={() => setRevision((n) => n + 1)}>Actualiser l’affichage</button>
      </div>
      <p className="muted">
        Les données affichées sont celles du dernier import officiel. Ce bouton ne lance pas de collecte sur
        FencingTimeLive.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Chargement…</p>}
      {data && (
        <>
          <h3>{data.competition.name}</h3>
          <p>
            <strong>
              {saved} / {activeRows.length}
            </strong>{' '}
            pronostics enregistrés · {rows.filter((r) => r.status === 'À compléter').length} encore à compléter
          </p>
          <progress value={saved} max={activeRows.length || 1} aria-label="Pronostics enregistrés" />
          <div className="filter-row">
            {['Tous', 'À compléter', 'Enregistré', 'Clos', 'Terminé', 'Annulé'].map((s) => (
              <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>
                {s}
              </button>
            ))}
          </div>
          <details className="round-recap">
            <summary>Mon bilan par tour</summary>
            <div className="round-recap-grid">
              {(data.rounds || []).map((r) => (
                <article key={roundLabel(r.round)}>
                  <button
                    className="round-recap-link"
                    aria-pressed={selectedRound === r.round}
                    onClick={() => openRound(r.round)}
                  >
                    {roundLabel(r.round)} · {roundStatus(r.round, r.completed)}
                  </button>
                  <p>
                    {r.finished} / {r.total} {plural(r.total, 'résultat')} · {r.saved} {plural(r.saved, 'pronostic')}
                  </p>
                  <strong>
                    {r.points} {plural(r.points, 'point')}
                    {!r.completed ? ` ${plural(r.points, 'provisoire')}` : ''}
                  </strong>
                  <p>
                    {r.exact} {plural(r.exact, 'score exact', 'scores exacts')} · {r.winners}{' '}
                    {plural(r.winners, 'vainqueur trouvé', 'vainqueurs trouvés')}
                  </p>
                </article>
              ))}
            </div>
            {!data.rounds?.length && <p>Le bilan sera disponible après publication du tableau.</p>}
          </details>
          <div id="round-results" tabIndex={-1} className="round-results">
            {selectedRound && (
              <div className="feature-heading">
                <h3>{roundLabel(selectedRound)} · les matchs</h3>
                <button className="button-secondary" onClick={() => setSelectedRound(null)}>
                  Voir tous les tours
                </button>
              </div>
            )}
            {filterPredictionRows(rows, filter, selectedRound).length === 0 && (
              <p>Aucun pronostic ne correspond à cette sélection.</p>
            )}
          </div>
          {filterPredictionRows(rows, filter, selectedRound).map((r) => (
            <article className="prediction-summary" key={r.key}>
              <div className="feature-heading">
                <strong>{r.name}</strong>
                <span className="status-pill">{r.status === 'Terminé' ? 'Résultat publié' : r.status}</span>
              </div>
              <small>
                {r.type}
                {r.round && ` · ${roundLabel(r.round)}`}
              </small>
              <div className="result-values">
                <div>
                  <small>Votre pronostic</small>
                  <strong>{r.prediction || 'Non renseigné'}</strong>
                </div>
                <div>
                  <small>Résultat</small>
                  <strong>{r.result || 'En attente'}</strong>
                </div>
                <div>
                  <small>Points gagnés</small>
                  <strong className="earned-points">{r.points ?? '—'}</strong>
                  {r.points !== null && <span>{r.details.join(' · ')}</span>}
                </div>
              </div>
              {r.sourceCheckedAt && (
                <small>Vérification officielle : {new Date(r.sourceCheckedAt).toLocaleString('fr-FR')}</small>
              )}
              {r.replacement && (
                <p>
                  <button className="button-secondary" onClick={() => onNavigate('play', r.replacement.key)}>
                    {r.replacement.saved ? 'Voir mon pronostic' : 'Pronostiquer la nouvelle rencontre'} :{' '}
                    {r.replacement.name}
                  </button>
                </p>
              )}
              {r.status !== 'Annulé' && (
                <div>
                  <button
                    className="button-secondary"
                    onClick={() => onNavigate(r.type === 'Poule' ? 'pools' : 'play', r.key)}
                  >
                    Voir {r.type === 'Poule' ? 'la poule' : r.type === 'Podium' ? 'le podium' : 'le match'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </>
      )}
      {summary && (
        <aside className="feature-panel">
          <h3>Mon bilan du tournoi</h3>
          <div className="stat-grid">
            <p>
              <strong>{summary.ranking?.rank || '—'}</strong> / {summary.players} au classement
            </p>
            <p>
              <strong>{summary.ranking?.totalPoints || 0}</strong> {plural(summary.ranking?.totalPoints || 0, 'point')}
            </p>
            <p>
              <strong>{summary.exact}</strong> {plural(summary.exact, 'score exact', 'scores exacts')}
            </p>
            <p>
              <strong>
                {summary.winners} / {summary.played}
              </strong>{' '}
              {plural(summary.winners, 'vainqueur trouvé', 'vainqueurs trouvés')} ({summary.accuracy ?? 0} %)
            </p>
          </div>
          <p>
            {progress
              ? `Évolution depuis le classement du ${new Date(progress.date).toLocaleString('fr-FR')} : ${progress.change > 0 ? '+' : ''}${progress.change} place(s).`
              : 'L’évolution sera disponible après deux imports faisant évoluer le classement.'}
          </p>
          <small>
            Le taux de réussite porte sur vos pronostics de matchs terminés. Les ex æquo partagent le même rang.
          </small>
          <TournamentShare summary={summary} tournamentId={tournamentId} />
        </aside>
      )}
    </section>
  );
}
