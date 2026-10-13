// Physionomie d'une rencontre : écart au score touche après touche (au-dessus : avantage au tireur 1,
// en dessous : au tireur 2), et fil des touches. Construit depuis le direct des pistes.
import { clockLabel } from '../lib/useLiveScores';

const W = 300,
  H = 90,
  PAD = 6;

export default function BoutFlow({ history, player1, player2, open = false }) {
  const touches = (history || []).filter((t) => t.by !== 'correction' || Number.isInteger(t.score1));
  if (!touches.length) return null;
  const points = [{ score1: 0, score2: 0 }, ...touches];
  const gaps = points.map((t) => t.score1 - t.score2);
  const span = Math.max(3, ...gaps.map((g) => Math.abs(g)));
  const x = (i) => PAD + (i * (W - 2 * PAD)) / Math.max(1, points.length - 1);
  const y = (g) => H / 2 - (g * (H / 2 - PAD)) / span;
  const path = gaps.map((g, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(g).toFixed(1)}`).join(' ');
  const last = touches.at(-1);
  const leader = last.score1 === last.score2 ? 'Égalité' : last.score1 > last.score2 ? player1 : player2;
  const counted = touches.filter((t) => t.by !== 'start').length;
  return (
    <details className="bout-flow" open={open}>
      <summary>
        Physionomie du match · {counted} {counted > 1 ? 'touches suivies' : 'touche suivie'}
      </summary>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Écart au score touche après touche, ${leader} en tête`}>
        <rect x="0" y="0" width={W} height={H / 2} className="bout-flow-p1" />
        <rect x="0" y={H / 2} width={W} height={H / 2} className="bout-flow-p2" />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="bout-flow-axis" />
        <path d={path} className="bout-flow-line" />
        {gaps.map((g, i) =>
          i ? <circle key={i} cx={x(i)} cy={y(g)} r="2.6" className={`bout-flow-dot by-${points[i].by}`} /> : null,
        )}
      </svg>
      <div className="bout-flow-legend">
        <span className="by-1">{player1}</span>
        <span className="by-2">{player2}</span>
      </div>
      <ol className="bout-flow-touches">
        {touches
          .map((t, i) => (
            <li key={i} className={`by-${t.by}`}>
              <b>
                {t.score1}–{t.score2}
              </b>
              <span>
                {t.by === 1
                  ? player1
                  : t.by === 2
                    ? player2
                    : t.by === 'double'
                      ? 'Coup double'
                      : t.by === 'start'
                        ? 'Début du suivi'
                        : 'Correction'}
              </span>
              <small>
                {clockLabel(t.clock)}
                {t.period > 0 && t.period < 10 ? ` · ${t.period}e` : ''}
              </small>
            </li>
          ))
          .reverse()}
      </ol>
    </details>
  );
}
