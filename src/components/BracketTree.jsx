import { useEffect, useRef, useState } from 'react';
import { entrantFrom, officialWinner, seedOf } from './bracketTree';
import { shortName, shortRoundName } from './eventResults';
import { usePerView } from './usePerView';
import { matchTotal } from './resultPresentation';
import { roundLabel, stripLabel } from './matchPresentation';

const time = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : null;
const Box = ({ value }) => (
  <span className={`tree-box${value === '' || value == null ? ' is-empty' : ''}`}>
    {value === '' || value == null ? '–' : value}
  </span>
);

// Ligne d'un tireur (composant de module : identité stable, les champs gardent le focus pendant la frappe).
function Row({ name, country, seed, win, extra = '', club, children }) {
  return (
    <div className={`tree-row${win ? ' is-win' : ''}${extra}`}>
      <span className="tree-seed" title={seed ? `Classement d’entrée dans le tableau : ${seed}` : undefined}>
        {seed ? (
          <>
            <span className="tree-full">({seed})</span>
            <span className="tree-short">{seed}</span>
          </>
        ) : (
          ''
        )}
      </span>
      <span className="tree-country">{country}</span>
      <span className="tree-name" title={name}>
        {club?.isClubFencer(name) && <span className="club-star">★ </span>}
        <span className="tree-full">{name}</span>
        <span className="tree-short">{shortName(name)}</span>
      </span>
      {children}
    </div>
  );
}

// Arbre du tableau : votre score pronostiqué en face des tireurs, résultat officiel en bas à droite.
export default function BracketTree({
  tree,
  ready,
  busy,
  drafts,
  values,
  mine,
  isClosed,
  visible,
  club,
  onType,
  onKey,
  onKeyUp,
  onLeave,
  onOpen,
  openId,
  revealId,
  renderDetail,
  onCloseDetail,
}) {
  const detailRef = useRef(null);
  useEffect(() => {
    if (!openId) return;
    const close = e => {
      if (!detailRef.current?.contains(e.target) && !e.target.closest('.tree-card')) onCloseDetail?.();
    };
    const escape = e => { if (e.key === 'Escape') onCloseDetail?.(); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [openId, onCloseDetail]);
  const valueOf = (m) => values(m);
  const perView = usePerView();
  // Tour affiché en premier : choisi par le joueur, sinon le premier tour encore ouvert aux pronostics
  // (puis le premier pas encore terminé) ; les tours suivants s'affichent à sa droite.
  const [focus, setFocus] = useState(null);
  const touch = useRef(null);
  const count = Math.min(perView, tree.rounds.length);
  const last = Math.max(0, tree.rounds.length - count);
  const firstWhere = (test) => tree.rounds.findIndex((r) => r.slots.some((s) => s.match && test(s.match)));
  const open = firstWhere((m) => !m.isFinished && !isClosed(m));
  const pending = firstWhere((m) => !m.isFinished);
  const auto = open >= 0 ? open : pending >= 0 ? pending : last;
  const start = Math.max(0, Math.min(last, focus ?? auto));
  const shown = tree.rounds.slice(start, start + count);
  const go = (i) => setFocus(Math.max(0, Math.min(last, i)));
  // Match à montrer (Entrée, « Pronostic suivant », lien d'une notification) : son tour devient visible.
  useEffect(() => {
    if (!revealId) return;
    const i = tree.rounds.findIndex((r) => r.slots.some((s) => s.match?.id === revealId.id));
    if (i >= 0 && (i < start || i >= start + count)) setFocus(Math.min(i, last));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealId]);

  const finishedCard = (m) => {
    const p = mine(m),
      total = p ? matchTotal(p) : null,
      w = officialWinner(m)?.name;
    return (
      <div
        className={`tree-card is-done${p ? (total > 0 ? ' is-good' : ' is-wrong') : ''}${openId === m.id ? ' is-open' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${m.player1} contre ${m.player2}, résultat publié`}
        onClick={() => onOpen(m)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(m))}
      >
        {[1, 2].map((i) => (
          <Row
            club={club}
            key={i}
            name={m[`player${i}`]}
            country={m[`player${i}Country`]}
            seed={seedOf(m, i)}
            win={w === m[`player${i}`]}
          >
            <Box value={p?.[`predictedScore${i}`]} />
          </Row>
        ))}
        <div className="tree-meta">
          <span>{stripLabel(m.strip)}</span>
          <span className="tree-result">
            {m.pointsPending
              ? 'Points à valider'
              : m.resultType === 'MEDICAL_WITHDRAWAL'
                ? 'Abandon'
                : `Résultat : ${m.score1}–${m.score2}`}{' '}
            <span className={`tree-chip ${p ? (total > 0 ? 'is-good' : 'is-wrong') : ''}`}>
              {m.pointsPending ? 'En attente' : p ? `${total > 0 ? '+' : ''}${total} pt${total > 1 ? 's' : ''}` : '—'}
            </span>
          </span>
        </div>
      </div>
    );
  };

  const liveCard = (m) => {
    const p = mine(m),
      v = valueOf(m),
      closed = isClosed(m),
      draft = Boolean(drafts[m.id]);
    const status = !ready
      ? ['Vérification…', '']
      : closed
        ? [m.pointsPending ? 'Points à valider' : m.syncIssue ? 'Vérification' : 'Clos · résultat à venir', '']
        : draft
          ? ['Non enregistré', 'is-draft']
          : p
            ? ['Enregistré', 'is-good']
            : ['À saisir', ''];
    const closesAt = !closed && time(m.closesAt);
    return (
      <div
        className={`tree-card${closed ? ' is-closed' : ' is-live'}${draft ? ' is-draft' : p && !closed ? ' is-saved' : ''}${openId === m.id ? ' is-open' : ''}`}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) onLeave(m);
        }}
        onClick={(e) => {
          if (!e.target.closest('input')) onOpen(m);
        }}
      >
        {[1, 2].map((i) => (
          <Row club={club} key={i} name={m[`player${i}`]} country={m[`player${i}Country`]} seed={seedOf(m, i)}>
            {closed ? (
              <Box value={p?.[`predictedScore${i}`]} />
            ) : (
              <input
                id={`input-${m.id}-${i}`}
                className="tree-input"
                aria-label={`Score prévu de ${m[`player${i}`]}`}
                inputMode="numeric"
                type="text"
                pattern="[0-9]*"
                maxLength={2}
                autoComplete="off"
                placeholder="–"
                enterKeyHint="next"
                value={v[`score${i}`]}
                disabled={busy || !ready}
                onChange={(e) => onType(m, i, e.target.value)}
                onKeyDown={(e) => onKey(m, i, e)}
                onKeyUp={(e) => onKeyUp(m, e)}
              />
            )}
          </Row>
        ))}
        <div className="tree-meta">
          <span>
            {stripLabel(m.strip)}
            {closesAt && ` · ferme ${closesAt}`}
          </span>
          <span className={`tree-chip ${status[1]}`}>{status[0]}</span>
        </div>
      </div>
    );
  };

  const advanceCard = (a, first) => (
    <div className="tree-card is-bye">
      <Row club={club} name={a.name} country={a.country} seed={a.seed} win>
        <span />
      </Row>
      <Row club={club} name={first ? 'Exempt' : 'Qualifié'} country="" extra=" is-tbd">
        <span />
      </Row>
      <div className="tree-meta">
        <span>{first ? 'Qualifié d’office' : 'Déjà qualifié'}</span>
      </div>
    </div>
  );

  const futureCard = (index, pos) => {
    const top = entrantFrom(tree, index, pos * 2 - 1, valueOf),
      bottom = entrantFrom(tree, index, pos * 2, valueOf);
    const pick = top.kind === 'pick' || bottom.kind === 'pick';
    return (
      <div className="tree-card is-future">
        {[top, bottom].map((e, i) => (
          <Row
            key={i}
            name={e.name}
            country={e.country || ''}
            seed={e.seed}
            extra={e.kind === 'pick' ? ' is-pick' : e.kind === 'tbd' ? ' is-tbd' : ''}
          >
            <Box value="" />
          </Row>
        ))}
        <div className="tree-meta">
          <span>{pick ? 'Selon vos pronostics' : 'Adversaires à venir'}</span>
          <span className="tree-chip">Pas encore ouvert</span>
        </div>
      </div>
    );
  };

  const slotCard = (index, slot) => {
    const m = slot.match;
    if (m) return m.isFinished ? finishedCard(m) : liveCard(m);
    if (slot.advance) return advanceCard(slot.advance, index === 0);
    return index === 0 ? null : futureCard(index, slot.pos);
  };

  const pairs = (slots) => {
    const out = [];
    for (let i = 0; i < slots.length; i += 2) out.push(slots.slice(i, i + 2));
    return out;
  };

  return (
    <div className="tree-paged">
      <div className="tree-tabs" role="tablist" aria-label="Tours du tableau">
        <button
          type="button"
          className="tree-arrow"
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
            className="tree-tab"
            onClick={() => go(i)}
          >
            {shortRoundName(r.round)}
          </button>
        ))}
        <button
          type="button"
          className="tree-arrow"
          disabled={start >= last}
          onClick={() => go(start + 1)}
          aria-label="Tour suivant"
        >
          ›
        </button>
      </div>
      <div
        className="tree"
        style={{ '--tree-cols': shown.length }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x,
            dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) go(start + (dx < 0 ? 1 : -1));
        }}
      >
        {shown.map((r, j) => {
          const index = start + j;
          const played = r.slots.filter((s) => s.match);
          return (
            <section
              className="tree-round"
              id={`tree-${r.round}`}
              key={r.round}
              aria-label={roundLabel(r.round)}
              style={{ '--tree-span': 2 ** j }}
            >
              <h2>
                {roundLabel(r.round)}{' '}
                <span className="round-count">
                  {played.filter((s) => mine(s.match)).length}/{played.length}
                </span>
              </h2>
              <div className="tree-slots">
                {pairs(r.slots).map((pair) => (
                  <div className="tree-pair" key={pair[0].pos}>
                    {pair.map((slot) => (
                      <div
                        className={`tree-slot${slot.match && !visible(slot.match) ? ' is-dimmed' : ''}`}
                        key={slot.pos}
                        id={slot.match ? `match-${slot.match.id}` : undefined}
                      >
                        {slotCard(index, slot)}
                        {slot.match?.id === openId && renderDetail && <section ref={detailRef}
                          className={`tree-inline-detail tree-detail${j === shown.length - 1 ? ' align-right' : ''}`}
                          aria-label="Détail du match">
                          <button className="button-secondary" onClick={onCloseDetail}>Fermer le détail</button>
                          {renderDetail(slot.match)}
                        </section>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
