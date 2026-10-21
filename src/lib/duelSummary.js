// Duel entre deux joueurs : synthèse lisible des lignes comparées (où se fait l'écart, épreuves décisives,
// lignes filtrées et triées par écart).
import { roundName } from '../components/eventResults.js';

const pts = (side) => side?.points || 0;
export const gapOf = (r) => pts(r.me) - pts(r.them);
const kindOf = (r) => r.kind || 'match';

export const CATEGORIES = [
  ['pool', 'Poules'],
  ['match', 'Matchs'],
  ['podium', 'Podiums'],
];

// Tour choisi dans le classement : « pools », « podium », un tour de tableau (« T64 », « J1:T64 »…) ou ''.
export function inRound(rows, round) {
  if (!round) return rows;
  if (round === 'pools') return rows.filter((r) => kindOf(r) === 'pool');
  if (round === 'podium') return rows.filter((r) => kindOf(r) === 'podium');
  return rows.filter((r) => kindOf(r) === 'match' && r.round === round);
}

// Points de chacun par catégorie (seulement celles présentes).
export function byCategory(rows) {
  return CATEGORIES.map(([kind, label]) => {
    const list = rows.filter((r) => kindOf(r) === kind);
    const me = list.reduce((s, r) => s + pts(r.me), 0),
      them = list.reduce((s, r) => s + pts(r.them), 0);
    return { kind, label, me, them, gap: me - them, count: list.length };
  }).filter((c) => c.count);
}

// Épreuves où l'écart est le plus grand (en valeur absolue).
export function decisiveEvents(rows, limit = 3) {
  const events = new Map();
  for (const r of rows) {
    const key = r.competitionId ?? r.competition ?? '—';
    const e = events.get(key) || { key, name: r.competition || 'Épreuve', gap: 0 };
    e.gap += gapOf(r);
    events.set(key, e);
  }
  return [...events.values()]
    .filter((e) => e.gap !== 0)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, limit);
}

export const FILTERS = [
  ['gaps', 'Écarts'],
  ['won', 'Je gagne'],
  ['lost', 'Il gagne'],
  ['all', 'Tout'],
];
// Lignes à afficher : les écarts d'abord, du plus grand au plus petit ; « Tout » garde l'ordre chronologique.
export function visibleRows(rows, filter = 'gaps') {
  const keep =
    filter === 'won'
      ? rows.filter((r) => gapOf(r) > 0)
      : filter === 'lost'
        ? rows.filter((r) => gapOf(r) < 0)
        : filter === 'all'
          ? rows
          : rows.filter((r) => gapOf(r) !== 0);
  return filter === 'all' ? keep : [...keep].sort((a, b) => Math.abs(gapOf(b)) - Math.abs(gapOf(a)));
}

// Libellé court du tour : « Poules », « Podium », « Tableau de 64 », « J1 · Tableau de 64 ».
export function roundOptionLabel(round) {
  if (round === 'pools') return 'Poules';
  if (round === 'podium') return 'Podium';
  if (round?.startsWith('J1:')) return `J1 · ${roundName(round.slice(3))}`;
  return roundName(round);
}
// Tours d'une épreuve pour le menu : poules, tableau du plus grand à la finale (J1 avant J2), podium.
export function roundOptions(matches = [], hasPools = false) {
  const size = (r) => (r === 'Bronze' ? 3 : Number(/T(\d+)$/.exec(r)?.[1]) || 0);
  const rounds = [...new Set(matches.map((m) => m.round).filter(Boolean))].sort(
    (a, b) => Number(b.startsWith('J1:')) - Number(a.startsWith('J1:')) || size(b) - size(a),
  );
  return [...(hasPools ? ['pools'] : []), ...rounds, 'podium'];
}
