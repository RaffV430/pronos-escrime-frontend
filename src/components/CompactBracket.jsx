import { roundLabel } from './matchPresentation';
import { useEffect, useRef, useState } from 'react';
import { withCount } from '../lib/plural';

export default function CompactBracket({ groups, visible, card, mine, selectedRound, onRoundChange }) {
  const root = useRef(null);
  const shown = groups;
  const total = shown.reduce((sum, g) => sum + g.items.length, 0);
  const [drawing, setDrawing] = useState({ width: 0, height: 0, paths: [] });
  const active = shown.some((g) => g.round === selectedRound) ? selectedRound : shown[0]?.round;
  const index = shown.findIndex((g) => g.round === active);
  useEffect(() => {
    const board = root.current;
    if (!board) return;
    const measure = () => {
      const origin = board.getBoundingClientRect(),
        paths = [];
      for (const group of shown) {
        if (!/^T\d+$/.test(group.round)) continue;
        const next = shown.find((g) => g.round === `T${Number(group.round.slice(1)) / 2}`);
        if (!next) continue;
        for (const match of group.items) {
          const slot = Number(match.sourceKey?.match(/:(\d+)$/)?.[1]);
          if (!slot) continue;
          const targets = next.items.filter((m) => Number(m.sourceKey?.match(/:(\d+)$/)?.[1]) === Math.ceil(slot / 2));
          if (targets.length !== 1) continue;
          const a = board.querySelector(`[data-bracket-id="${match.id}"]`),
            b = board.querySelector(`[data-bracket-id="${targets[0].id}"]`);
          if (!a || !b || !a.getBoundingClientRect().width || !b.getBoundingClientRect().width) continue;
          const ar = a.getBoundingClientRect(),
            br = b.getBoundingClientRect();
          const x1 = ar.right - origin.left,
            y1 = ar.top - origin.top + ar.height / 2,
            x2 = br.left - origin.left,
            y2 = br.top - origin.top + br.height / 2;
          paths.push(`M${x1},${y1} C${x1 + 20},${y1} ${x2 - 20},${y2} ${x2},${y2}`);
        }
      }
      const next = { width: board.scrollWidth, height: board.scrollHeight, paths };
      setDrawing((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    board.querySelectorAll('article').forEach((el) => observer.observe(el));
    measure();
    return () => observer.disconnect();
  }, [shown]);
  return (
    <>
      {total > 0 && (
        <nav className="compact-round-nav" aria-label="Tour du tableau">
          <button
            className="button-secondary"
            aria-label="Tour précédent"
            disabled={index <= 0}
            onClick={() => onRoundChange(shown[index - 1].round)}
          >
            ←
          </button>
          <label>
            Tour
            <select value={active || ''} onChange={(e) => onRoundChange(e.target.value)}>
              {shown.map((g) => (
                <option key={g.round} value={g.round}>
                  {roundLabel(g.round)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button-secondary"
            aria-label="Tour suivant"
            disabled={index >= shown.length - 1}
            onClick={() => onRoundChange(shown[index + 1].round)}
          >
            →
          </button>
        </nav>
      )}
      <div className="compact-bracket-scroll">
        <div className="compact-bracket" ref={root}>
          <svg className="bracket-links" width={drawing.width} height={drawing.height} aria-hidden="true">
            {drawing.paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
          {shown.map((group, i) => {
            const items = group.items.filter(visible);
            const numbered = group.items
              .map((m) => Number(m.sourceKey?.match(/:(\d+)$/)?.[1]))
              .filter(Number.isInteger)
              .filter((n) => n > 0);
            const missing = /^T\d+$/.test(group.round)
              ? Math.max(0, Number(group.round.slice(1)) / 2 - new Set(numbered).size)
              : 0;
            return (
              <section
                className="compact-round"
                data-active={active === group.round}
                key={roundLabel(group.round)}
                style={{ '--round-offset': `${Math.min(i * 32, 96)}px` }}
              >
                <h2>
                  {roundLabel(group.round)}
                  <span className="round-count">
                    {group.items.filter((m) => mine(m)).length}/{group.items.length}
                  </span>
                </h2>
                <div className="compact-round-cards">
                  {items.map((m) => (
                    <div key={m.id} data-bracket-id={m.id}>
                      {card(m)}
                    </div>
                  ))}
                  {!items.length && <p className="compact-round-note">Aucun match pour ce filtre.</p>}
                  {missing > 0 && (
                    <p className="compact-round-note">
                      {withCount(missing, 'emplacement')} sans rencontre importée · exemptions ou adversaires à venir
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
