import { plural, roundStatus, filterPredictionRows } from './resultPresentation';
import { roundLabel } from './matchPresentation';
import { useState, useEffect } from 'react';
import API from '../api';
import TournamentShare from './TournamentShare';
import EventRecap from './EventRecap';

const STATUSES = ['Tous', 'À compléter', 'Enregistré', 'Clos', 'Terminé', 'Annulé'];
const errorText = (e) => e.response?.data?.error || 'Chargement impossible. Réessayez.';

// Une ligne de pronostic (match, poule ou podium) avec son résultat et ses points.
function PredictionRow({ r, onOpen }) {
  return (
    <article className="prediction-summary">
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
          {r.points !== null && r.points !== undefined && <span>{(r.details || []).join(' · ')}</span>}
        </div>
      </div>
      {r.sourceCheckedAt && (
        <small>Vérification officielle : {new Date(r.sourceCheckedAt).toLocaleString('fr-FR')}</small>
      )}
      {onOpen && r.replacement && (
        <p>
          <button className="button-secondary" onClick={() => onOpen('play', r.replacement.key)}>
            {r.replacement.saved ? 'Voir mon pronostic' : 'Pronostiquer la nouvelle rencontre'} : {r.replacement.name}
          </button>
        </p>
      )}
      {onOpen && r.status !== 'Annulé' && (
        <div>
          <button className="button-secondary" onClick={() => onOpen(r.type === 'Poule' ? 'pools' : 'play', r.key)}>
            Voir {r.type === 'Poule' ? 'la poule' : r.type === 'Podium' ? 'le podium' : 'le match'}
          </button>
        </div>
      )}
    </article>
  );
}

function TournamentSummary({ tournamentId, revision }) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    API.get(`/me/summary/${tournamentId}`, { signal: controller.signal })
      .then(({ data }) => !controller.signal.aborted && setSummary(data))
      .catch(() => {});
    return () => controller.abort();
  }, [tournamentId, revision]);
  if (!summary) return null;
  const progress = summary.progress;
  return (
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
          ? `Évolution depuis le classement du ${new Date(progress.date).toLocaleString('fr-FR')} : ${progress.change > 0 ? '+' : ''}${progress.change} place${Math.abs(progress.change) > 1 ? 's' : ''}.`
          : 'L’évolution sera disponible après deux imports faisant évoluer le classement.'}
      </p>
      <small>
        Le taux de réussite porte sur vos pronostics de matchs terminés. Les ex æquo partagent le même rang.
      </small>
      <TournamentShare summary={summary} tournamentId={tournamentId} />
    </aside>
  );
}

// Détail d'une épreuve : tous ses matchs (y compris à compléter), bilan par tour.
function EventDetail({ competitionId, revision, onOpen, playerName }) {
  const [data, setData] = useState(null),
    [filter, setFilter] = useState('Tous'),
    [selectedRound, setSelectedRound] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    API.get(`/me/predictions?competitionId=${competitionId}`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setData(data);
        setError('');
      })
      .catch((e) => !controller.signal.aborted && setError(errorText(e)));
    return () => controller.abort();
  }, [competitionId, revision]);
  const openRound = (round) => {
    setSelectedRound(round);
    setFilter('Tous');
    requestAnimationFrame(() => document.getElementById('round-results')?.focus());
  };
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Chargement…</p>;
  const rows = data.rows || [],
    activeRows = rows.filter((r) => r.status !== 'Annulé'),
    saved = activeRows.filter((r) => r.prediction).length,
    shown = filterPredictionRows(rows, filter, selectedRound);
  return (
    <div className="mine-detail">
      <h3>{data.competition.name}</h3>
      <EventRecap competitionId={competitionId} playerName={playerName} revision={revision} />
      <p>
        <strong>
          {saved} / {activeRows.length}
        </strong>{' '}
        pronostics enregistrés · {rows.filter((r) => r.status === 'À compléter').length} encore à compléter
      </p>
      <progress value={saved} max={activeRows.length || 1} aria-label="Pronostics enregistrés" />
      <div className="filter-row">
        {STATUSES.map((s) => (
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
        {shown.length === 0 && <p>Aucun pronostic ne correspond à cette sélection.</p>}
      </div>
      {shown.map((r) => (
        <PredictionRow key={r.key} r={r} onOpen={onOpen} />
      ))}
    </div>
  );
}

// Vue d'ensemble : pronostics de plusieurs épreuves, regroupés par tournoi puis par épreuve.
function Overview({ events, onPick, onOpen }) {
  const [filter, setFilter] = useState('Tous');
  const statuses = STATUSES.filter((s) => s !== 'À compléter');
  const count = events.reduce((n, e) => n + e.rows.filter((r) => r.status !== 'Annulé').length, 0);
  const points = events.reduce((n, e) => n + (e.points || 0), 0);
  const toComplete = events.reduce((n, e) => n + (e.toComplete || 0), 0);
  const groups = [];
  for (const e of events) {
    const g = groups.find((x) => x.tournament.id === e.tournament.id);
    if (g) g.events.push(e);
    else groups.push({ tournament: e.tournament, events: [e] });
  }
  return (
    <div className="mine-overview">
      <p>
        <strong>{count}</strong> {plural(count, 'pronostic')} · <strong>{points}</strong> {plural(points, 'point')} ·{' '}
        {events.length} {plural(events.length, 'épreuve')}
        {toComplete > 0 && ` · ${toComplete} encore à compléter`}
      </p>
      <div className="filter-row">
        {statuses.map((s) => (
          <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.tournament.id} className="mine-tournament">
          {groups.length > 1 && (
            <h3>
              {g.tournament.name}
              {g.tournament.archived && <small className="muted"> · archivé</small>}
            </h3>
          )}
          {g.events.map((e) => {
            const rows = filterPredictionRows(e.rows, filter);
            return (
              <details key={e.competition.id} className="mine-event" open={events.length <= 3}>
                <summary>
                  <strong>{e.competition.name}</strong>
                  <span className="muted">
                    {' '}
                    · {e.saved} {plural(e.saved, 'pronostic')} · {e.points} {plural(e.points, 'point')}
                    {e.toComplete > 0 && ` · ${e.toComplete} à compléter`}
                  </span>
                </summary>
                <p>
                  <button className="button-link" onClick={() => onPick(e)}>
                    Détail de l’épreuve (bilan par tour)
                  </button>
                </p>
                {rows.length ? (
                  rows.map((r) => (
                    <PredictionRow
                      key={r.key}
                      r={r}
                      onOpen={e.tournament.archived ? null : (tab, key) => onOpen(tab, key, e)}
                    />
                  ))
                ) : (
                  <p className="muted">Aucun pronostic ne correspond à ce filtre.</p>
                )}
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}

// « Mes pronostics » : sélection propre à l'onglet (tous les tournois par défaut),
// indépendante de l'épreuve choisie dans « Pronostiquer ».
export default function MyPredictions({ userId, playerName = '', initialCompetitionId = null, onNavigate }) {
  const [all, setAll] = useState(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [tournamentId, setTournamentId] = useState(''),
    [competitionId, setCompetitionId] = useState(''),
    [initial, setInitial] = useState(initialCompetitionId);
  useEffect(() => {
    const controller = new AbortController();
    API.get('/me/predictions/all', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setAll({ events: Array.isArray(data?.events) ? data.events : [], truncated: !!data?.truncated });
        setError('');
      })
      .catch((e) => !controller.signal.aborted && setError(errorText(e)));
    return () => controller.abort();
  }, [userId, revision]);
  // Lien direct (notification « résultats ») : l'épreuve concernée est présélectionnée une fois.
  useEffect(() => {
    if (!all || !initial) return;
    const e = all.events.find((x) => x.competition.id === Number(initial));
    if (e) {
      setTournamentId(String(e.tournament.id));
      setCompetitionId(String(e.competition.id));
    }
    setInitial(null);
  }, [all, initial]);

  const events = all?.events || [];
  const tournaments = [];
  for (const e of events) if (!tournaments.some((t) => t.id === e.tournament.id)) tournaments.push(e.tournament);
  const tournamentEvents = events.filter((e) => String(e.tournament.id) === tournamentId);
  const selected = events.find((e) => String(e.competition.id) === competitionId);
  const pick = (e) => {
    setTournamentId(String(e.tournament.id));
    setCompetitionId(String(e.competition.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const open = (e) => (tab, key) =>
    onNavigate(tab, key, { tournamentId: e.tournament.id, competitionId: e.competition.id });

  return (
    <section className="feature-panel">
      <div className="feature-heading">
        <h1 className="section-title">Mes pronostics</h1>
        <button onClick={() => setRevision((n) => n + 1)}>Actualiser l’affichage</button>
      </div>
      <p className="muted">
        Les données affichées sont celles du dernier import officiel. Ce bouton ne lance pas de collecte sur
        FencingTimeLive.
      </p>
      {error && <p role="alert">{error}</p>}
      {!all && !error && <p>Chargement…</p>}
      {all && !events.length && (
        <p>Vous n’avez encore aucun pronostic. Choisissez une épreuve dans « Pronostiquer » pour commencer.</p>
      )}
      {all && events.length > 0 && (
        <>
          <div className="mine-selectors">
            <label>
              Tournoi
              <select
                value={tournamentId}
                onChange={(e) => {
                  setTournamentId(e.target.value);
                  setCompetitionId('');
                }}
              >
                <option value="">Tous les tournois</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.archived ? ' (archivé)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Épreuve
              <select value={competitionId} disabled={!tournamentId} onChange={(e) => setCompetitionId(e.target.value)}>
                <option value="">Toutes les épreuves</option>
                {tournamentEvents.map((e) => (
                  <option key={e.competition.id} value={e.competition.id}>
                    {e.competition.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted mine-hint">Cette sélection ne change pas l’épreuve choisie dans « Pronostiquer ».</p>
          {selected ? (
            <EventDetail
              key={`detail-${selected.competition.id}`}
              competitionId={selected.competition.id}
              revision={revision}
              playerName={playerName}
              onOpen={selected.tournament.archived ? null : open(selected)}
            />
          ) : (
            <Overview
              key={`overview-${tournamentId || 'all'}`}
              events={tournamentId ? tournamentEvents : events}
              onPick={pick}
              onOpen={(tab, key, e) => open(e)(tab, key)}
            />
          )}
          {all.truncated && !tournamentId && (
            <p className="muted">Seules les 60 épreuves les plus récentes sont affichées.</p>
          )}
          {tournamentId && (
            <TournamentSummary
              key={`summary-${tournamentId}`}
              tournamentId={Number(tournamentId)}
              revision={revision}
            />
          )}
        </>
      )}
    </section>
  );
}
