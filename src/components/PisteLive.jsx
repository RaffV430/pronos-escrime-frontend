import { useRecordedHistory } from '../lib/useRecordedHistory';
import AdaptiveFencerName from './AdaptiveFencerName';
import { eventNameFor } from '../lib/eventName';
import { useI18n } from '../i18n/context';
import { useEffect, useRef, useState } from 'react';
import CrowdTrend from './CrowdTrend';
import { roundLabel, groupMatches } from './matchPresentation';
import { officialLink, pisteMatches, pistePrediction, pisteStatus, ftlPresentation } from '../lib/pisteLive';
import TouchStrip from './TouchStrip';
import TeamRelayHistory from './TeamRelayHistory';
import LiveScore from './LiveScore';
import LivePistes from './LivePistes';
import TeamLiveOverview from './TeamLiveOverview';
import { relayNamesForMatch } from '../lib/teamLiveOverview';
import { useNow } from '../lib/polling';
import { useLiveScores } from '../lib/useLiveScores';

export default function PisteLive({
  matches,
  competition,
  userId,
  ready,
  error,
  stale,
  onPlay,
  onFollow,
  initialMatchId = null,
  embedded = false,
  showLiveOverview = false,
  onSelectTeam,
}) {
  const { t, lang } = useI18n();
  const STATUS = {
    'Vérification en cours': 'status.checking',
    'Résultat publié': 'status.published',
    'Résultat attendu': 'status.waiting',
    'Pronostics ouverts': 'status.open',
  };
  const statusLabel = (m) => t(STATUS[pisteStatus(m)] || pisteStatus(m));
  const roundName = (r) => (['T4', 'T2'].includes(r) ? t(`round.${r}`) : roundLabel(r));
  const [round, setRound] = useState('');
  const [strip, setStrip] = useState('');
  const [mine, setMine] = useState(false);
  const [selectedId, setSelectedId] = useState(initialMatchId);
  const scoreRef = useRef(null);
  const filtered = pisteMatches(matches, { round, strip, mine, userId });
  // Scores en direct des pistes : une rencontre en cours passe devant dans le tableau de score.
  const live = useLiveScores(
    competition?.id ?? matches[0]?.competitionId,
    matches.some((m) => !m.isFinished),
  );
  const team = competition?.podiumFormat === 'TEAM';
  const teamLive = useLiveScores(competition?.id, team && matches.some((m) => !m.isFinished), true);
  const now = useNow(5000);
  const isLive = (id) => Boolean(live.get(id) && !live.get(id).finished);
  const liveCount = [...live.values()].filter((x) => !x.finished).length;
  const match =
    filtered.find((m) => m.id === selectedId) ||
    filtered.find((m) => isLive(m.id)) ||
    filtered.find((m) => !m.isFinished && m.isClosed) ||
    filtered.filter((m) => m.isFinished).at(-1) ||
    filtered[0];
  const { prediction, points } = pistePrediction(match, userId);
  const recorded = useRecordedHistory(match?.id, Boolean(match?.isFinished));
  const { match: displayMatch, live: displayLive } = ftlPresentation(
    match,
    match?.isFinished && recorded.data && !recorded.data.error
      ? { ...recorded.data, finished: true }
      : live.get(match?.id),
  );
  const relayNames = team ? relayNamesForMatch(teamLive, displayMatch, competition?.id, now) : null;
  const source = officialLink(match?.sourceUrl || competition?.sourceUrl);
  const strips = [...new Set(matches.map((m) => String(m.strip || '')).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr', { numeric: true }),
  );
  const finished = filtered
    .filter((m) => m.isFinished)
    .slice(-6)
    .reverse();
  useEffect(() => {
    if (initialMatchId && ready) {
      scoreRef.current?.focus({ preventScroll: true });
      scoreRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [initialMatchId, ready]);
  const selectMatch = (id) => {
    setRound('');
    setStrip('');
    setMine(false);
    setSelectedId(id);
    requestAnimationFrame(() => {
      const target = scoreRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
    });
  };
  return (
    <section className="piste-live" aria-label="Rencontres en direct">
      {!embedded && (
        <header className="piste-live-heading">
          <div>
            <p className="arena-eyebrow">{t('live.eyebrow')}</p>
            <h1>{t('live.heading')}</h1>
            <p>{eventNameFor(lang, competition?.name) || t('live.chooseEvent')}</p>
          </div>
          <button className="button-secondary" onClick={() => onPlay(match)}>
            {t('live.play')}
          </button>
        </header>
      )}
      <p className="piste-live-notice">
        {competition?.podiumFormat === 'TEAM' && `${eventNameFor(lang, competition.name)} : `}
        {liveCount ? t('live.noticeLive', { n: liveCount }) : t('live.noticeIdle')}
      </p>
      {stale && <p role="status">{t('live.stale')}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="piste-live-filters">
        <label>
          {t('live.round')}
          <select value={round} onChange={(e) => setRound(e.target.value)}>
            <option value="">{t('live.allRounds')}</option>
            {groupMatches(matches).map((g) => (
              <option key={g.round} value={g.round}>
                {roundName(g.round)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('live.stripLabel')}
          <select value={strip} onChange={(e) => setStrip(e.target.value)}>
            <option value="">{t('live.allStrips')}</option>
            {strips.map((s) => (
              <option key={s} value={s}>
                {t('live.stripOption', { strip: s })}
              </option>
            ))}
          </select>
        </label>
        <button className="button-secondary" aria-pressed={mine} onClick={() => setMine(!mine)}>
          {t('live.mineOnly')}
        </button>
      </div>
      {showLiveOverview && competition?.podiumFormat === 'TEAM' && (
        <TeamLiveOverview
          competition={competition}
          matches={matches}
          userId={userId}
          selectedId={match?.id}
          onSelect={(row, selectedMatch) => {
            if (row.competitionId === competition.id) selectMatch(selectedMatch.id);
            else onSelectTeam?.(row, selectedMatch);
          }}
        />
      )}
      {showLiveOverview && competition?.podiumFormat !== 'TEAM' && (
        <LivePistes
          matches={matches}
          live={live}
          selectedId={match?.id}
          ready={ready}
          error={error}
          userId={userId}
          onSelect={selectMatch}
        />
      )}

      {!ready ? (
        <p>{t('live.loading')}</p>
      ) : !match ? (
        <div className="feature-panel">
          <h2>{t('live.none')}</h2>
          <p>{t('live.noneHint')}</p>
        </div>
      ) : (
        <>
          <article className="piste-live-score" key={match.id} ref={scoreRef} tabIndex={-1}>
            <div className="piste-live-meta">
              <span>
                {roundName(match.round)}
                {match.strip ? ` · ${t('live.strip', { strip: match.strip })}` : ''}
              </span>
              <span>{statusLabel(match)}</span>
            </div>
            <LiveScore live={displayLive} />
            <div className={`piste-live-duel${team ? ' is-team' : ''}`}>
              {[1, 2].map((i) => (
                <div
                  className={`piste-live-athlete lamp-${i}${
                    isLive(match.id) && displayLive[`fencer${i}`]?.lamp
                      ? ' is-lit'
                      : isLive(match.id) && displayLive[`fencer${i}`]?.white
                        ? ' is-white'
                        : ''
                  }`}
                  key={i}
                >
                  <span className="arena-avatar">
                    {displayMatch[`player${i}`]
                      ?.split(/\s+/)
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join('')}
                  </span>
                  <AdaptiveFencerName name={displayMatch[`player${i}`]} country={displayMatch[`player${i}Country`]} />
                  {team && !match.isFinished && (
                    <span className="piste-team-relay">En piste : {relayNames?.[i - 1] || 'non transmis'}</span>
                  )}
                  {isLive(match.id) && !displayLive[`fencer${i}`]?.lamp && displayLive[`fencer${i}`]?.white && (
                    <span className="white-lamp-badge">{t('live.invalidTouch')}</span>
                  )}
                  <strong className="piste-live-score-number">
                    {match.isFinished && Number.isInteger(displayMatch[`score${i}`])
                      ? displayMatch[`score${i}`]
                      : isLive(match.id)
                        ? displayLive[`score${i}`]
                        : '—'}
                  </strong>
                </div>
              ))}
            </div>
            {match?.isFinished && recorded.data?.error && (
              <p role="status">
                {recorded.data.error}{' '}
                <button type="button" onClick={recorded.retry}>
                  Réessayer
                </button>
              </p>
            )}
            {match?.isFinished &&
              recorded.data &&
              !recorded.data.error &&
              !recorded.data.history?.length &&
              !recorded.data.historyIssue && <p className="muted">Aucune touche enregistrée pour cette rencontre.</p>}
            {match?.isFinished && displayLive?.history?.length > 0 && (
              <p className="muted recorded-history-note">
                Observations réellement reçues ; des séquences peuvent manquer.
                {(displayLive.history.at(-1).score1 !== displayMatch.score1 ||
                  displayLive.history.at(-1).score2 !== displayMatch.score2) &&
                  ` Dernier score suivi : ${displayLive.history.at(-1).score1}–${displayLive.history.at(-1).score2}.`}
              </p>
            )}
            {(!match?.isFinished ||
              displayLive?.history?.length > 0 ||
              displayLive?.historyIssue ||
              displayMatch.officialRelays?.length > 0) &&
              (team ? (
                <TeamRelayHistory
                  officialRelays={displayMatch.officialRelays}
                  history={displayLive?.history}
                  issue={displayLive?.historyIssue}
                  live={isLive(match.id)}
                />
              ) : (
                <TouchStrip
                  history={displayLive?.history}
                  issue={displayLive?.historyIssue}
                  player1={displayMatch.player1}
                  player2={displayMatch.player2}
                  live={isLive(match.id)}
                />
              ))}
            <div className="piste-live-panels">
              <section>
                <p className="arena-eyebrow">{t('live.yourPrediction')}</p>
                <h3>
                  {prediction
                    ? displayLive?.ftlLeftPlayer === 2 && !displayLive.finished
                      ? `${prediction.predictedScore2} – ${prediction.predictedScore1}`
                      : `${prediction.predictedScore1} – ${prediction.predictedScore2}`
                    : t('live.notSet')}
                </h3>
                <p>{points === null ? t('live.pointsLater') : t('live.pointsWon', { n: points })}</p>
              </section>
              <section>
                <p className="arena-eyebrow">{t('live.crowd')}</p>
                {match.crowd?.total ? <CrowdTrend match={displayMatch} /> : <p>{t('live.crowdLater')}</p>}
              </section>
            </div>
            {onFollow && (
              <div className="filter-row">
                <button className="button-secondary" onClick={() => onFollow?.(match)}>
                  {t('live.inBracket')}
                </button>
                <button className="button-secondary" onClick={() => onPlay(match)}>
                  {t('live.thisPrediction')}
                </button>
              </div>
            )}
            {source && (
              <a href={source} target="_blank" rel="noreferrer">
                {t('live.official')}
              </a>
            )}
          </article>
          <div className="piste-live-bottom">
            <section>
              <h2>{t('live.matches')}</h2>
              <div className="piste-live-grid">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    className="piste-live-tile"
                    aria-pressed={m.id === match.id}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <small>
                      {roundName(m.round)}
                      {m.strip ? ` · ${t('live.strip', { strip: m.strip })}` : ''} ·{' '}
                      {isLive(m.id) ? t('live.tileLive') : statusLabel(m)}
                    </small>
                    <span>
                      {m.player1}
                      <b>{m.isFinished ? (m.score1 ?? '—') : isLive(m.id) ? live.get(m.id).score1 : '—'}</b>
                    </span>
                    <span>
                      {m.player2}
                      <b>{m.isFinished ? (m.score2 ?? '—') : isLive(m.id) ? live.get(m.id).score2 : '—'}</b>
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <aside className="feature-panel">
              <h2>{t('live.latest')}</h2>
              {finished.length ? (
                finished.map((m) => {
                  const p = pistePrediction(m, userId);
                  return (
                    <div className="piste-live-result" key={`${m.id}:${p.points}`}>
                      <strong>
                        {m.player1} / {m.player2}
                      </strong>
                      <p>
                        {roundName(m.round)} · {m.score1 ?? '—'} – {m.score2 ?? '—'}
                      </p>
                      {p.points !== null && <b className="piste-live-points">{t('live.points', { n: p.points })}</b>}
                    </div>
                  );
                })
              ) : (
                <p>{t('live.resultsSoon')}</p>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
