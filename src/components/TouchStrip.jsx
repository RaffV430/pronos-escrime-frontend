// Fil des touches : une case par touche, rouge (tireur 1), verte (tireur 2) ou dorée (coup double),
// de plus en plus vive vers les touches récentes. Une case touchée affiche le score à ce moment-là.
import { useState } from 'react';
import { clockLabel } from '../lib/useLiveScores';
import { shortName } from '../lib/fencerName';

const periodLabel = (p) => (p > 0 && p < 10 ? ` · ${p}${p === 1 ? 're' : 'e'} pér.` : '');

export default function TouchStrip({ history, player1, player2, compact = false, title = 'Fil des touches' }) {
  const touches = (history || []).filter((t) => [1, 2, 'double'].includes(t.by));
  const start = (history || []).find((t) => t.by === 'start');
  const [picked, setPicked] = useState(null);
  if (!touches.length && !start) return null;
  const shown = picked === null ? touches.at(-1) : touches[picked];
  const who = (t) => (t.by === 1 ? shortName(player1) : t.by === 2 ? shortName(player2) : 'Coup double');
  return (
    <div className={`touch-strip${compact ? ' is-compact' : ''}`}>
      <p className="touch-strip-title">
        {title}
        {start && (
          <small>
            {' '}
            · suivi dès {start.score1}–{start.score2}
          </small>
        )}
      </p>
      <div className="touch-strip-cells" role="list">
        {touches.map((t, i) => (
          <button
            type="button"
            role="listitem"
            key={i}
            className={`touch-cell by-${t.by}${picked === i ? ' is-picked' : ''}`}
            style={{ '--strength': (0.45 + (0.55 * (i + 1)) / touches.length).toFixed(2) }}
            aria-label={`${t.score1}–${t.score2}, ${who(t)}, ${clockLabel(t.clock)}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPicked(picked === i ? null : i);
            }}
          />
        ))}
      </div>
      {shown && (
        <p className="touch-strip-caption">
          <b>
            {shown.score1}–{shown.score2}
          </b>{' '}
          {who(shown)}
          {clockLabel(shown.clock) && ` · ${clockLabel(shown.clock)}`}
          {periodLabel(shown.period)}
          {picked === null && touches.length > 1 && <small> · dernière touche</small>}
        </p>
      )}
    </div>
  );
}
