import { useMemo, useState } from 'react';
import { scopeLabels } from '../lib/delegationScope';
import { roundLabel } from './matchPresentation';
import { plural } from './resultPresentation';
import { FILTERS, byCategory, decisiveEvents, gapOf, inRound, roundOptionLabel, visibleRows } from '../lib/duelSummary';
import './duel.css';

const PAGE = 20;
const signed = (n) => (n > 0 ? `+${n}` : String(n));
const tone = (n) => (n > 0 ? 'is-up' : n < 0 ? 'is-down' : '');
const side = (s) => (s ? `${s.prediction} · ${s.points} ${plural(s.points, 'pt', 'pts')}` : 'pas de prono');

// Duel avec un autre joueur (groupe, club ou Classements), sur ce qui est terminé uniquement : d'abord où se fait
// l'écart (catégories, épreuves décisives), puis les lignes qui font une différence, des plus grands écarts aux
// plus petits. round : tour choisi dans le classement d'une épreuve (« pools », « podium », « T64 »…).
export default function DuelView({ duel, onClose, round = '' }) {
  const { opponent } = duel;
  const them = opponent?.name || 'Adversaire';
  const [filter, setFilter] = useState('gaps');
  const [shown, setShown] = useState(PAGE);
  const rows = useMemo(() => inRound(duel.rows || [], round), [duel.rows, round]);
  const totals = useMemo(() => {
    if (!round) return duel.totals;
    const sum = (k) => rows.reduce((s, r) => s + (r[k]?.points || 0), 0);
    return {
      me: sum('me'),
      them: sum('them'),
      won: rows.filter((r) => gapOf(r) > 0).length,
      lost: rows.filter((r) => gapOf(r) < 0).length,
      drawn: rows.filter((r) => gapOf(r) === 0).length,
    };
  }, [duel.totals, rows, round]);
  const categories = byCategory(rows);
  const max = Math.max(1, ...categories.flatMap((c) => [c.me, c.them]));
  const events = round ? [] : decisiveEvents(rows);
  const list = visibleRows(rows, filter);
  const gap = totals.me - totals.them;
  const scopes = duel.predictionScopes;
  return (
    <div className="feature-panel duel duel-v2">
      <div className="feature-heading">
        <h3>Vous contre {them}</h3>
        <button className="button-secondary" onClick={onClose}>
          Fermer
        </button>
      </div>
      {scopes && scopes[0] !== scopes[1] && (
        <p className="muted">
          Vous pronostiquez : {scopeLabels[scopes[0]]} · {them} : {scopeLabels[scopes[1]]}
        </p>
      )}
      <p className="duel-gap" aria-label="Écart du duel">
        <strong className={tone(gap)}>
          {gap === 0 ? 'À égalité' : `${signed(gap)} ${plural(Math.abs(gap), 'pt', 'pts')}`}
        </strong>
        <span>
          {gap > 0 ? 'd’avance' : gap < 0 ? 'de retard' : ''} · {totals.me} – {totals.them}
          {round ? ` · ${roundOptionLabel(round)}` : ''}
        </span>
      </p>
      <p className="muted">
        {totals.won} {plural(totals.won, 'gagné', 'gagnés')} · {totals.lost} {plural(totals.lost, 'perdu')} ·{' '}
        {totals.drawn} à égalité. Seuls les matchs, poules et podiums terminés sont comparés.
      </p>
      {!rows.length && <p>Rien de terminé pronostiqué par l’un de vous deux{round ? ' sur ce tour' : ''}.</p>}
      {categories.length > 1 && (
        <section className="duel-block" aria-label="Où se fait l’écart">
          <h4>Où se fait l’écart</h4>
          {categories.map((c) => (
            <div className="duel-cat" key={c.kind}>
              <div className="duel-cat-head">
                <span>{c.label}</span>
                <span className={tone(c.gap)}>
                  {c.me} – {c.them} · <b>{signed(c.gap)}</b>
                </span>
              </div>
              <div className="duel-bars" aria-hidden="true">
                <span className="duel-bar is-me" style={{ width: `${(c.me / max) * 100}%` }} />
                <span className="duel-bar is-them" style={{ width: `${(c.them / max) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="duel-legend muted">
            <span className="duel-dot is-me" /> vous <span className="duel-dot is-them" /> {them}
          </p>
        </section>
      )}
      {events.length > 1 && (
        <section className="duel-block" aria-label="Épreuves décisives">
          <h4>Épreuves décisives</h4>
          <ul className="duel-events">
            {events.map((e) => (
              <li key={e.key}>
                <span>{e.name}</span>
                <b className={tone(e.gap)}>{signed(e.gap)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
      {rows.length > 0 && (
        <>
          <div className="duel-filters" role="group" aria-label="Lignes du duel">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={filter === key ? '' : 'button-secondary'}
                aria-pressed={filter === key}
                onClick={() => {
                  setFilter(key);
                  setShown(PAGE);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {!list.length && <p className="muted">Aucune ligne pour ce filtre.</p>}
          <ul className="duel-list">
            {list.slice(0, shown).map((r) => {
              const g = gapOf(r);
              return (
                <li
                  key={`${r.kind || 'match'}-${r.matchId || r.poolId || r.competitionId}`}
                  className={`duel-line${g > 0 ? ' line-up' : g < 0 ? ' line-down' : ''}`}
                >
                  <div className="duel-line-head">
                    <strong>{r.name}</strong>
                    <b className={tone(g)}>{g === 0 ? '=' : signed(g)}</b>
                  </div>
                  <small>
                    {[
                      r.competition,
                      r.round && roundLabel(r.round),
                      r.kind && r.kind !== 'match' ? r.result : `résultat ${r.result}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                  <small>
                    Vous : {side(r.me)} · {them} : {side(r.them)}
                  </small>
                </li>
              );
            })}
          </ul>
          {list.length > shown && (
            <button type="button" className="button-secondary duel-more" onClick={() => setShown((n) => n + PAGE)}>
              Voir {Math.min(PAGE, list.length - shown)} de plus ({list.length - shown} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}
