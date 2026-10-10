import { useCallback, useEffect, useRef, useState } from 'react';
import IndicatorInput from './IndicatorInput';
import { parseIndicator } from '../lib/indicator.js';
import API from '../api';
import useLocalDraft, { draftKey } from './useLocalDraft';
import DraftNotice from './DraftNotice';
import './PoolPredictions.css';
import { withCount } from '../lib/plural';
import { pollWhileVisible, useNow } from '../lib/polling';
import { useFencerFollows, isFollowedFencer } from '../lib/fencerFollows';
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
  const follows = useFencerFollows();
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
      : pool.lockMode === 'PROVISIONAL'
        ? 'Tirage provisoire'
        : pool.isClosed
          ? 'Poule fermée'
          : closed
            ? pool.lockMode !== 'TIME'
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
        {isFollowedFencer(follows, fencer.name) && (
          <span className="club-star" title="Tireur suivi">
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
          Ajoutez de 2 à 8 tire…3650 tokens truncated…                       <abbr title="Points gagnés">Pts</abbr>
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
            </div>
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
