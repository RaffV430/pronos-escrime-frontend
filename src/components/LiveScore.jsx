// Bandeau « En direct » d'une rencontre : piste, chrono, période et score qui évolue.
// Avec onOpen, tout le bandeau ouvre le suivi en grand dans le Direct.
import { clockLabel } from '../lib/useLiveScores';
import './live-score.css';

export default function LiveScore({ live, compact = false, onOpen = null }) {
  if (!live || live.finished) return null;
  const period =
    live.period > 0 && live.period < 10 ? ` · ${live.period === 1 ? '1re' : `${live.period}e`} période` : '';
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      className={`live-score${compact ? ' is-compact' : ''}`}
      role={onOpen ? undefined : 'status'}
      aria-live="polite"
      aria-label={onOpen ? `En direct, ${live.score1} à ${live.score2} : voir le suivi en grand` : undefined}
      onClick={
        onOpen
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen(live.matchId);
            }
          : undefined
      }
    >
      <span className="live-score-tag">
        <span className="live-score-dot" aria-hidden="true" />
        En direct
      </span>
      <span className="live-score-meta">
        Piste {live.strip}
        {clockLabel(live.clock) && ` · ${clockLabel(live.clock)}`}
        {period}
      </span>
      <b className="live-score-value">
        <span className={live.fencer1?.lamp ? 'is-lit' : undefined}>{live.score1}</span>–
        <span className={live.fencer2?.lamp ? 'is-lit' : undefined}>{live.score2}</span>
      </b>
      {onOpen && <span className="live-score-open">Voir en grand →</span>}
    </Tag>
  );
}
