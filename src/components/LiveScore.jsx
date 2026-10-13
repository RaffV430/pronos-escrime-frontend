// Bandeau « En direct » d'une rencontre : piste, chrono, période et score qui évolue.
import { clockLabel } from '../lib/useLiveScores';
import './live-score.css';

export default function LiveScore({ live, compact = false }) {
  if (!live) return null;
  const period = live.period > 0 && live.period < 10 ? ` · ${live.period}e période` : '';
  return (
    <div className={`live-score${compact ? ' is-compact' : ''}`} role="status" aria-live="polite">
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
    </div>
  );
}
