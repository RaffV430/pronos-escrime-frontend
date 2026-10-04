import { useCallback, useEffect, useState } from 'react';
import IndicatorInput from './IndicatorInput';
import { parseIndicator } from '../lib/indicator.js';
import ScoringRules from './ScoringRules';
import API from '../api';
import useLocalDraft, { draftKey } from './useLocalDraft';
import DraftNotice from './DraftNotice';
import './PoolPredictions.css';
import { withCount } from '../lib/plural';
import { pollWhileVisible, useNow } from '../lib/polling';
import { useClub } from '../lib/club';
import { stripLabel } from './matchPresentation';

const message = (error) => error.response?.data?.error || 'Connexion impossible. Réessayez.';
const signed = (value) => (value > 0 ? `+${value}` : String(value));

// Nation (code olympique) et classement, affichés discrètement après le nom : « FRA · 3 ».
// Classement saisi pour la poule s'il existe, sinon rang d'entrée dans l'épreuve.
function fencerMeta(pool, fencer) {
  const rank =
    pool.rankingSystem && Number.isInteger(fencer.ranking) && fencer.ranking > 0
      ? fencer.ranking
      : Number.isInteger(fencer.entryRanking) && fencer.entryRanking > 0
        ? fencer.entryRanking
        : null;
  return [fencer.countryCode, rank].filter(Boolean).join(' · ');
}

// Suivi en direct : bilan provisoire relevé sur FencingTimeLive à chaque contrôle (toutes les 2 minutes).
// Une poule est « en cours » dès qu'un résultat est connu, jusqu'à la publication du résultat final.
const poolIsLive = (pool) =>
  !pool.isFinal && pool.fencers.some((f) => f.firstResultAt || (f.wins ?? 0) + (f.losses ?? 0) > 0);

function LiveCell({ fencer, bouts }) {
  const known = Number.isInteger(fencer.wins) && Number.isInteger(fencer.losses);
  if (!known)
    return (
      <td data-label="Live" className="pool-live-cell">
        {fencer.firstResultAt ? (
          <span
            className="pool-live-pending"
            title="Un score est en cours de saisie sur le site officiel : bilan affiché au prochain contrôle."
          >
            saisie…
          </span>
        ) : (
          <span className="pool-live-pending">—</span>
        )}
      </td>
    );
  const played = fencer.wins + fencer.losses;
  const indicator = fencer.indicator ?? 0;
  return (
    <td
      data-label="Live"
      className={`pool-live-cell${played === 0 ? ' is-idle' : ''}`}
      aria-label={`En direct : ${played} match${played > 1 ? 's' : ''} tiré${played > 1 ? 's' : ''} sur ${bouts}, ${fencer.wins} victoire${fencer.wins > 1 ? 's' : ''}, indice ${signed(indicator)}`}
    >
      <span className="pool-live-played">
        {played}/{bouts} <abbr title="matchs tirés">m.</abbr>
      </span>
      <span className="pool-live-score">
        <strong>{fencer.wins} V</strong> <span>{signed(indicator)}</span>
      </span>
    </td>
  );
}

function PredictionRow({ userId, pool, fencer, closed, onRefresh, reportDirty, live = false }) {
  const club = useClub();
  const localDraft = useLocalDraft(draftKey(userId, pool.competitionId, `pool-${fencer.id}`));
  const [wins, setWins] = useState(fencer.prediction?.wins ?? '');
  const [indicator, setIndicator] = useState(fencer.prediction?.indicator ?? '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    reportDirty(fencer.id, dirty);
    return () => reportDirty(fencer.id, false);
  }, [dirty, fencer.id, reportDirty]);
  const bouts = pool.fencers.length - 1;
  const losses = wins === '' ? '' : bouts - Number(wins);
  const minimum = wins === '' ? -5 * bouts : Number(wins) - 5 * losses;
  const maximum = wins === '' ? 5 * bouts : 5 * Number(wins) - losses;
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      await API.put(`/pools/${pool.id}/fencers/${fencer.id}/prediction`, {
        wins: Number(wins),
        losses,
        indicator: parseIndicator(indicator),
      });
      localDraft.discard();
      setDirty(false);
      setFeedback('');
      onRefresh();
    } catch (error) {
      setFeedback(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setFeedback('');
    try {
      await API.delete(`/pools/${pool.id}/fencers/${fencer.id}/prediction`);
      localDraft.discard();
      setDirty(false);
      setWins('');
      setIndicator('');
      setFeedback('');
      onRefresh();
    } catch (error) {
      setFeedback(message(error));
    } finally {
      setBusy(false);
    }
  }
  const formId = `pool-prediction-${pool.id}-${fencer.id}`;
  // Suspension temporaire (contrôle FencingTimeLive en retard), à distinguer d'un blocage définitif.
  const pending = closed && !pool.isFinal && !pool.isClosed && !fencer.firstResultAt && Boolean(pool.sourceUnavailable);
  const lockReason = pool.isFinal
    ? 'Résultats publiés'
    : fencer.firstResultAt
      ? 'Premier résultat publié'
      : pool.isClosed
        ? 'Poule fermée'
        : closed
          ? pool.lockMode === 'FIRST_RESULT'
            ? 'Vérification en attente'
            : 'Clôture atteinte'
          : 'Pronostic ouvert';
  const resultCell = (predicted, actual, isIndicator = false) => (
    <>
      <span className="pool-predicted">{predicted == null ? '—' : isIndicator ? signed(predicted) : predicted}</span>
      <strong className="pool-actual">{actual == null ? '—' : isIndicator ? signed(actual) : actual}</strong>
    </>
  );
  return (
    <tr id={`pool-${fencer.id}`} className={closed ? 'pool-table-row is-closed' : 'pool-table-row'}>
      <th scope="row" className="pool-name-cell">
        <span className="pool-position">{fencer.position}</span>{' '}
        {club.isClubFencer(fencer.name) && (
          <span className="club-star" title="Tireur du club">
            ★{' '}
          </span>
        )}
        <span>{fencer.name}</span>
        {fencerMeta(pool, fencer) && <span className="pool-fencer-meta"> {fencerMeta(pool, fencer)}</span>}
      </th>
      {live && <LiveCell fencer={fencer} bouts={bouts} />}
      <td data-label="Victoires" className="pool-number-cell">
        {pool.isFinal ? (
          resultCell(fencer.prediction?.wins, fencer.wins)
        ) : (
          <input
            form={formId}
            aria-label={`Victoires de ${fencer.name}`}
            type="number"
            min="0"
            max={bouts}
            step="1"
            required
            value={wins}
            onChange={(e) => {
              setDirty(true);
              setWins(e.target.value);
              localDraft.persist({ wins: e.target.value, indicator });
            }}
            disabled={closed || busy}
          />
        )}
      </td>
      <td data-label="Défaites" className="pool-number-cell pool-losses-cell">
        {pool.isFinal ? (
          resultCell(fencer.prediction?.losses, fencer.losses)
        ) : (
          <span
            className="pool-losses"
            title="Calcul automatique"
            aria-label={`Défaites de ${fencer.name} : ${losses === '' ? 'non calculées' : losses}`}
          >
            {losses === '' ? '—' : losses}
          </span>
        )}
      </td>
      <td data-label="Indice" className="pool-number-cell">
        {pool.isFinal ? (
          resultCell(fencer.prediction?.indicator, fencer.indicator, true)
        ) : (
          <IndicatorInput
            form={formId}
            label={fencer.name}
            minimum={minimum}
            maximum={maximum}
            placeholder={closed ? '' : '+8'}
            value={indicator}
            onChange={(next) => {
              setDirty(true);
              setIndicator(next);
              localDraft.persist({ wins, indicator: next });
            }}
            disabled={closed || busy}
          />
        )}
      </td>
      {pool.isFinal && (
        <td data-label="Points gagnés" className="pool-points-cell">
          {fencer.comparison ? (
            <strong
              title={`Victoires : ${fencer.comparison.points.winsPoints} pts ; indice : ${fencer.comparison.points.indicatorPoints} pts`}
            >
              {fencer.comparison.points.total}
            </strong>
          ) : null}
          {fencer.comparison?.points.adjusted && (
            <small
              className="pool-adjusted"
              title={`${fencer.comparison.points.adjusted.annulled} match(s) annulé(s) : comparé à ${fencer.comparison.points.adjusted.wins} V · indice ${signed(fencer.comparison.points.adjusted.indicator)}`}
            >
              Ajusté
              <span className="pool-long-label">
                {' '}
                : {fencer.comparison.points.adjusted.annulled} match
                {fencer.comparison.points.adjusted.annulled > 1 ? 's annulés' : ' annulé'} · comparé à{' '}
                {fencer.comparison.points.adjusted.wins} V · indice{' '}
                {signed(fencer.comparison.points.adjusted.indicator)}
              </span>
            </small>
          )}
          {!fencer.comparison && '—'}
        </td>
      )}
      {!pool.isFinal && (
        <td data-label="Pronostic" className="pool-state-cell">
          {pending ? (
            <span
              className="pool-row-state pool-row-pending"
              title="Vérification du site officiel en attente : la saisie reprend automatiquement au prochain contrôle."
            >
              ⏳<span className="pool-long-label"> En attente</span>
            </span>
          ) : closed || pool.isFinal ? (
            <span
              className="pool-row-state"
              title={fencer.prediction || pool.isFinal ? lockReason : `${lockReason} · aucun pronostic`}
            >
              🔒
              <span className="pool-long-label">
                {' '}
                {fencer.prediction || pool.isFinal ? lockReason : 'Aucun pronostic'}
              </span>
            </span>
          ) : (
            <form id={formId} onSubmit={save} className="pool-row-actions">
              {fencer.prediction && !dirty ? (
                <span
                  className="pool-saved"
                  title={`Enregistré : ${fencer.prediction.wins} V · ${fencer.prediction.losses} D · ${signed(fencer.prediction.indicator)}`}
                >
                  ✓<span className="pool-long-label"> Enregistré</span>
                </span>
              ) : (
                <button
                  disabled={busy}
                  type="submit"
                  className="pool-save"
                  aria-label={`Enregistrer le pronostic de ${fencer.name}`}
                >
                  {busy ? (
                    '…'
                  ) : (
                    <>
                      <span className="pool-long-label">Enregistrer</span>
                      <span className="pool-short-label" aria-hidden="true">
                        OK
                      </span>
                    </>
                  )}
                </button>
              )}
              {fencer.prediction && (
                <button
                  disabled={busy}
                  type="button"
                  className="pool-secondary pool-icon-button"
                  aria-label={`Supprimer le pronostic de ${fencer.name}`}
                  title="Supprimer"
                  onClick={remove}
                >
                  ✕
                </button>
              )}
            </form>
          )}
          {!closed && fencer.prediction && dirty && (
            <small className="pool-saved-previous">
              Enregistré : {fencer.prediction.wins} V · {signed(fencer.prediction.indicator)}
            </small>
          )}
          {!closed && (
            <DraftNotice
              draft={localDraft}
              onRestore={(value) => {
                setWins(value.wins ?? '');
                setIndicator(value.indicator ?? '');
                setDirty(true);
              }}
            />
          )}
          <span role="status" className="pool-row-feedback">
            {feedback}
          </span>
        </td>
      )}
    </tr>
  );
}

function PoolAdmin({ pool, closed, onRefresh }) {
  const [results, setResults] = useState(() =>
    Object.fromEntries(pool.fencers.map((f) => [f.id, { wins: f.wins ?? '', indicator: f.indicator ?? '' }])),
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const bouts = pool.fencers.length - 1;
  async function close() {
    setBusy(true);
    setFeedback('');
    try {
      await API.post(`/pools/${pool.id}/close`);
      onRefresh();
    } catch (error) {
      setFeedback(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function publish(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      const response = await API.put(`/pools/${pool.id}/results`, {
        results: pool.fencers.map((f) => ({
          fencerId: f.id,
          wins: Number(results[f.id].wins),
          losses: bouts - Number(results[f.id].wins),
          indicator: parseIndicator(results[f.id].indicator),
        })),
      });
      setFeedback(response.data.message);
      onRefresh();
    } catch (error) {
      setFeedback(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="pool-admin">
      <summary>Administration · {pool.name}</summary>
      {!closed ? (
        <>
          <p>La fermeture manuelle est définitive. Fermez les pronostics avant de saisir les résultats.</p>
          <button disabled={busy} onClick={close}>
            Fermer les pronostics
          </button>
        </>
      ) : (
        <form onSubmit={publish}>
          <p>
            Résultats complets d’une poule en 5 touches, sans abandon. Une correction remplace les points précédents.
          </p>
          {pool.fencers.map((f) => (
            <div className="pool-official" key={f.id}>
              <strong>{f.name}</strong>
              <label>
                Victoires
                <input
                  aria-label={`Victoires officielles de ${f.name}`}
                  type="number"
                  min="0"
                  max={bouts}
                  required
                  value={results[f.id].wins}
                  onChange={(e) => setResults((prev) => ({ ...prev, [f.id]: { ...prev[f.id], wins: e.target.value } }))}
                />
              </label>
              <label>
                Indice
                <IndicatorInput
                  label={`${f.name} (officiel)`}
                  minimum={-5 * bouts}
                  maximum={5 * bouts}
                  value={results[f.id].indicator}
                  onChange={(next) => setResults((prev) => ({ ...prev, [f.id]: { ...prev[f.id], indicator: next } }))}
                />
              </label>
            </div>
          ))}
          <button disabled={busy}>
            {busy
              ? 'Publication…'
              : pool.isFinal
                ? 'Corriger les résultats et recalculer'
                : 'Publier les résultats et calculer les points'}
          </button>
        </form>
      )}
      <p role="status">{feedback}</p>
    </details>
  );
}

function CreatePool({ competitionId, onRefresh }) {
  const [name, setName] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [lockMode, setLockMode] = useState('FIRST_RESULT');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePoolNumber, setSourcePoolNumber] = useState('');
  const [rankingSystem, setRankingSystem] = useState('');
  const [roster, setRoster] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  async function create(event) {
    event.preventDefault();
    setFeedback('');
    setBusy(true);
    try {
      await API.post('/pools', {
        competitionId,
        name,
        lockMode,
        rankingSystem: rankingSystem || null,
        ...(lockMode === 'FIRST_RESULT'
          ? { sourceUrl, sourcePoolNumber: Number(sourcePoolNumber) }
          : { closesAt: new Date(closesAt).toISOString() }),
        fencers: roster
          .split('\n')
          .map((n) => n.trim())
          .filter(Boolean),
      });
      setName('');
      setRoster('');
      setFeedback('Poule créée.');
      onRefresh();
    } catch (error) {
      setFeedback(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="pool-admin">
      <summary>Créer une poule</summary>
      <form onSubmit={create} className="pool-create">
        <p>
          Ajoutez de 2 à 8 tireurs, un par ligne. La composition et le mode de clôture ne seront plus modifiables après
          création.
        </p>
        <label>
          Nom de la poule
          <input
            required
            maxLength="100"
            placeholder="Poule 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Blocage des pronostics
          <select value={lockMode} onChange={(e) => setLockMode(e.target.value)}>
            <option value="FIRST_RESULT">Premier résultat de chaque tireur sur FencingTimeLive</option>
            <option value="TIME">Horaire fixe pour toute la poule</option>
          </select>
        </label>
        {lockMode === 'FIRST_RESULT' ? (
          <>
            <label>
              Lien des poules FencingTimeLive
              <input
                required
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.fencingtimelive.com/pools/scores/…"
              />
            </label>
            <label>
              Numéro de poule sur FencingTimeLive
              <input
                required
                type="number"
                min="1"
                max="1000"
                value={sourcePoolNumber}
                onChange={(e) => setSourcePoolNumber(e.target.value)}
              />
            </label>
            <p>
              Chaque tireur est bloqué indépendamment au premier résultat détecté, victoire ou défaite. Actualisation
              après vérification de la source officielle. Si la vérification est trop ancienne, les saisies sont
              temporairement suspendues.
            </p>
          </>
        ) : (
          <label>
            Clôture des pronostics
            <input required type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            <small>
              Heure locale de votre appareil ({Intl.DateTimeFormat().resolvedOptions().timeZone}), à fixer avant le
              début de la poule.
            </small>
          </label>
        )}
        <label>
          Classement de référence
          <select value={rankingSystem} onChange={(e) => setRankingSystem(e.target.value)}>
            <option value="">Non précisé</option>
            <option value="FIE">FIE · Coupe du monde, Mondiaux, JO</option>
            <option value="EFC">EFC · Circuit européen</option>
            <option value="NATIONAL">National · Épreuve nationale</option>
          </select>
          <small>Utiliser le classement de la liste d’engagement, dans la catégorie et l’arme de l’épreuve.</small>
        </label>
        <label>
          Tireurs
          <textarea
            required
            rows="7"
            placeholder={'Prénom Nom\nPrénom Nom'}
            value={roster}
            onChange={(e) => setRoster(e.target.value)}
          />
        </label>
        <button disabled={busy}>{busy ? 'Création…' : 'Créer la poule'}</button>
        <p role="status">{feedback}</p>
      </form>
    </details>
  );
}

function PoolList({ competitionId, user, onDirtyChange, refreshVersion }) {
  const [dirtyRows, setDirtyRows] = useState({});
  const reportDirty = useCallback(
    (id, value) =>
      setDirtyRows((old) => {
        if (Boolean(old[id]) === value) return old;
        const next = { ...old };
        if (value) next[id] = true;
        else delete next[id];
        return next;
      }),
    [],
  );
  const dirty = Object.keys(dirtyRows).length > 0;
  useEffect(() => {
    onDirtyChange?.(dirty);
    const leave = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => {
      onDirtyChange?.(false);
      window.removeEventListener('beforeunload', leave);
    };
  }, [dirty, onDirtyChange]);
  const [pools, setPools] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({ pending: true, published: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const now = useNow(5000);
  const reload = useCallback(() => setRefresh((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    API.get(`/pools?competitionId=${competitionId}`, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setPools(res.data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(message(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [competitionId, refresh, refreshVersion]);
  useEffect(() => pollWhileVisible(reload, 30000), [reload]);
  return (
    <>
      <div className="pool-toolbar">
        <button className="pool-secondary" onClick={reload} disabled={loading}>
          Actualiser
        </button>
        <span role="status">{loading ? 'Chargement des poules…' : withCount(pools.length, 'poule')}</span>
      </div>
      {error && (
        <p role="alert" className="pool-error">
          {error}
        </p>
      )}
      {!loading && !error && pools.length === 0 && (
        <p className="pool-empty">
          Aucune poule disponible pour cette épreuve. Les tireurs apparaîtront dès la création des poules par
          l’administrateur.
        </p>
      )}
      {!loading &&
        !error &&
        pools.length > 0 &&
        [
          {
            key: 'pending',
            title: 'Poules à compléter',
            items: pools
              .filter((pool) => !pool.isFinal)
              .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })),
            empty: 'Toutes les poules disponibles ont un résultat publié.',
          },
          {
            key: 'published',
            title: 'Résultats publiés',
            items: pools
              .filter((pool) => pool.isFinal)
              .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })),
            empty: 'Aucun résultat de poule publié pour le moment.',
          },
        ].map((group) => (
          <details
            className="pool-group"
            key={group.key}
            open={expandedGroups[group.key]}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              setExpandedGroups((previous) =>
                previous[group.key] === open ? previous : { ...previous, [group.key]: open },
              );
            }}
          >
            <summary>
              <h3 className="pool-group-title">
                {group.title} <span className="pool-group-count">{group.items.length}</span>
              </h3>
            </summary>
            {group.items.length === 0 && <p className="pool-empty">{group.empty}</p>}
            {group.items.map((pool) => {
              const closed =
                pool.isClosed || (pool.lockMode !== 'FIRST_RESULT' && new Date(pool.closesAt).getTime() <= now);
              // Le serveur décide seul si la vérification FencingTimeLive est à jour (avant le début des
              // poules, la saisie reste ouverte) : aucune règle de délai dupliquée ici.
              const sourcePending = Boolean(pool.sourceUnavailable);
              const live = poolIsLive(pool);
              return (
                <article className="pool-card" key={pool.id}>
                  <header>
                    <h3>
                      {pool.name}{' '}
                      <span className="pool-card-meta">
                        {pool.fencers.length} tireurs · {pool.fencers.length - 1} matchs
                        {pool.strip && ` · ${stripLabel(pool.strip).toLowerCase()}`}
                        {pool.startsAt &&
                          ` · ${new Date(pool.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        {pool.lockMode !== 'FIRST_RESULT' &&
                          ` · clôture ${new Date(pool.closesAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`}
                      </span>
                    </h3>
                    <span
                      className={`pool-badge ${closed ? 'closed' : ''}`}
                      title={
                        pool.lockMode === 'FIRST_RESULT'
                          ? 'Clôture individuelle au premier résultat détecté sur le site officiel.'
                          : undefined
                      }
                    >
                      {pool.isFinal
                        ? 'Résultats publiés'
                        : closed
                          ? 'Pronostics clos'
                          : pool.lockMode === 'FIRST_RESULT'
                            ? 'Blocage par tireur'
                            : 'Pronostics ouverts'}
                    </span>
                  </header>
                  {pool.sourceUnavailable && !closed && !pool.isFinal && (
                    <p className="pool-pending" role="status">
                      ⏳ Saisie suspendue : vérification du site officiel en attente. Elle reprend automatiquement au
                      prochain contrôle.
                    </p>
                  )}
                  {pool.recomposedAt && !closed && (
                    <p className="pool-recomposed" role="status">
                      Poule modifiée sur le site officiel le{' '}
                      {new Date(pool.recomposedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}{' '}
                      : pronostics à refaire.
                    </p>
                  )}
                  {pool.rankingSourceUrl && (
                    <p className="pool-deadline">
                      <a href={pool.rankingSourceUrl} target="_blank" rel="noreferrer">
                        Liste d’engagement · nationalités et classements
                      </a>
                    </p>
                  )}
                  {live && (
                    <p className="pool-live-status" role="status">
                      <span className="pool-live-dot" aria-hidden="true" /> Poule en cours · suivi en direct
                      {pool.sourceCheckedAt &&
                        ` · dernier contrôle du site officiel à ${new Date(pool.sourceCheckedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}{' '}
                      · mise à jour toutes les 2 minutes
                    </p>
                  )}
                  <div className="pool-table-scroll" role="region" aria-label={`Tableau de ${pool.name}`} tabIndex={0}>
                    <table className="pool-table">
                      <caption className={pool.isFinal ? 'pool-caption' : 'visually-hidden'}>
                        {pool.isFinal
                          ? 'En petit : votre pronostic · en gras : le résultat réel.'
                          : 'Saisissez les victoires et l’indice, puis enregistrez chaque ligne. Les défaites sont calculées automatiquement.'}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Tireur</th>
                          {live && (
                            <th scope="col" className="pool-live-head">
                              <abbr title="En direct sur FencingTimeLive : matchs tirés, victoires et indice (contrôle toutes les 2 minutes)">
                                <span className="pool-live-dot" aria-hidden="true" />
                                Live
                              </abbr>
                            </th>
                          )}
                          <th scope="col" className="pool-number-head">
                            <abbr title="Victoires">V</abbr>
                          </th>
                          <th scope="col" className="pool-number-head pool-losses-head">
                            <abbr title="Défaites (calcul automatique)">D</abbr>
                          </th>
                          <th scope="col" className="pool-number-head">
                            <abbr title="Indice (touches données − reçues)">Ind.</abbr>
                          </th>
                          {pool.isFinal && (
                            <th scope="col" className="pool-number-head">
                              <abbr title="Points gagnés">Pts</abbr>
                            </th>
                          )}
                          {!pool.isFinal && (
                            <th scope="col">
                              <span className="visually-hidden">Pronostic</span>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {pool.fencers.map((fencer) => (
                          <PredictionRow
                            userId={user.id}
                            key={`${fencer.id}-${fencer.prediction?.updatedAt || 'none'}`}
                            reportDirty={reportDirty}
                            pool={pool}
                            fencer={fencer}
                            closed={
                              pool.isFinal ||
                              closed ||
                              Boolean(fencer.firstResultAt) ||
                              Boolean(fencer.isClosed) ||
                              sourcePending
                            }
                            onRefresh={reload}
                            live={live}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {user.isAdmin && <PoolAdmin pool={pool} closed={closed} onRefresh={reload} />}
                </article>
              );
            })}
          </details>
        ))}
      {user.isAdmin && <CreatePool competitionId={competitionId} onRefresh={reload} />}
    </>
  );
}

export default function PoolPredictions({ selectedCompetitionId, user, onDirtyChange, refreshVersion }) {
  return (
    <section className="pool-section" aria-labelledby="pool-title">
      <h2 id="pool-title">Pronostics de poules</h2>
      <p>Pour chaque tireur, prévoyez son bilan et son indice : touches données − touches reçues.</p>
      <ScoringRules />
      {selectedCompetitionId ? (
        <PoolList
          refreshVersion={refreshVersion}
          key={`${user.id}-${selectedCompetitionId}`}
          competitionId={selectedCompetitionId}
          user={user}
          onDirtyChange={onDirtyChange}
        />
      ) : (
        <p>Aucune épreuve sélectionnée.</p>
      )}
    </section>
  );
}
