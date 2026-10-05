import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTree, officialWinner, seedOf } from './bracketTree';
import { roundName, shortName, shortRoundName } from './eventResults';

// Nombre de tours affichés côte à côte selon la largeur (2 sur téléphone : un tour et le suivant).
function usePerView() {
  const query = () =>
    typeof window === 'undefined' || !window.matchMedia
      ? 4
      : window.matchMedia('(max-width: 600px)').matches
        ? 2
        : window.matchMedia('(max-width: 1000px)').matches
          ? 3
          : 4;
  const [n, setN] = useState(query);
  useEffect(() => {
    if (!window.matchMedia) return;
    const lists = ['(max-width: 600px)', '(max-width: 1000px)'].map((q) => window.matchMedia(q));
    const update = () => setN(query());
    lists.forEach((l) => l.addEventListener?.('change', update));
    return () => lists.forEach((l) => l.removeEventListener?.('change', update));
  }, []);
  return n;
}

function Side({ m, n, won }) {
  const seed = seedOf(m, n);
  const score = m.resultType === 'MEDICAL_WITHDRAWAL' ? (won ? '' : 'ab.') : (m[`score${n}`] ?? '');
  return (
    <span className={`rb-side${won ? ' is-win' : ''}`}>
      <span className="rb-seed">{seed ? seed : ''}</span>
      <span className="rb-name">
        <span className="rb-full">{m[`player${n}`]}</span>
        <span className="rb-short">{shortName(m[`player${n}`])}</span>
      </span>
      <span className="rb-country">{m[`player${n}Country`] || ''}</span>
      <span className="rb-score">{m.pointsPending ? '…' : score}</span>
    </span>
  );
}

function Card({ slot, onOpen }) {
  const m = slot.match;
  if (!m)
    return (
      <div className="rb-card is-empty">
        <span className="rb-side">
          <span className="rb-seed" />
          <span className="rb-name">{slot.advance?.name || '—'}</span>
        </span>
        <span className="rb-side">
          <span className="rb-seed" />
          <span className="rb-name muted">{slot.advance ? 'exempt' : ''}</span>
        </span>
      </div>
    );
  const w = officialWinner(m);
  const won = (n) => Boolean(w && w.name === m[`player${n}`]);
  return (
    <button
      type="button"
      className="rb-card"
      onClick={() => onOpen(m)}
      aria-label={`${roundName(m.round)} : ${m.player1} contre ${m.player2}`}
    >
      <Side m={m} n={1} won={won(1)} />
      <Side m={m} n={2} won={won(2)} />
    </button>
  );
}

// Tableau en arbre : un tour et les suivants côte à côte, chaque match centré entre les deux matchs
// d'où viennent ses tireurs. Onglets ou glissement du doigt pour changer de tour.
export default function ResultsBracket({ matches, onOpen }) {
  const tree = useMemo(() => buildTree(matches), [matches]);
  const perView = usePerView();
  const [focus, setFocus] = useState(0);
  const touch = useRef(null);
  if (!tree) return null;
  const last = Math.max(0, tree.rounds.length - Math.min(perView, tree.rounds.length));
  const start = Math.min(focus, last);
  const shown = tree.rounds.slice(start, start + perView);
  const go = (i) => setFocus(Math.max(0, Math.min(last, i)));
  const showsFinal = start + shown.length === tree.rounds.length;
  return (
    <div className="rb">
      <div className="rb-tabs" role="tablist" aria-label="Tours du tableau">
        <button
          type="button"
          className="rb-arrow"
          disabled={start === 0}
          onClick={() => go(start - 1)}
          aria-label="Tour précédent"
        >
          ‹
        </button>
        {tree.rounds.map((r, i) => (
          <button
            key={r.round}
            type="button"
            role="tab"
            aria-selected={i >= start && i < start + shown.length}
            className="rb-tab"
            onClick={() => go(i)}
          >
            {shortRoundName(r.round)}
          </button>
        ))}
        <button
          type="button"
          className="rb-arrow"
          disabled={start >= last}
          onClick={() => go(start + 1)}
          aria-label="Tour suivant"
        >
          ›
        </button>
      </div>
      <div
        className="rb-columns"
        style={{ '--rb-cols': shown.length }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touch.current ?? e.changedTouches[0].clientX);
          if (Math.abs(dx) > 50) go(start + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        {shown.map((r, j) => (
          <section
            key={r.round}
            className={`rb-round${j < shown.length - 1 ? ' has-next' : ''}${j > 0 ? ' has-prev' : ''}`}
          >
            <h4>{roundName(r.round)}</h4>
            <div className="rb-slots">
              {r.slots.map((slot) => (
                <div
                  key={slot.pos}
                  className={`rb-slot ${slot.pos % 2 ? 'is-top' : 'is-bottom'}`}
                  style={{ '--rb-span': 2 ** j }}
                >
                  <Card slot={slot} onOpen={onOpen} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {showsFinal && tree.bronze && (
        <div className="rb-bronze">
          <h4>{roundName('Bronze')}</h4>
          <Card slot={{ match: tree.bronze }} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}
