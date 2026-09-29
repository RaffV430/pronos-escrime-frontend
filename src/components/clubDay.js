import { normalizeName } from '../lib/club.js';

// Ordre des tours d'un tableau, du premier à la finale.
const ORDER = ['T512', 'T256', 'T128', 'T64', 'T32', 'T16', 'T8', 'T4', 'Bronze', 'T2'];
const rank = (round) => {
  const i = ORDER.indexOf(round);
  return i === -1 ? -1 : i;
};

// Parcours du jour d'un tireur du club : poule (bilan en direct ou final) et tableau.
export function fencerDay(name, pools = [], matches = [], { team = false } = {}) {
  const key = normalizeName(name);
  const same = (n) => normalizeName(n) === key;
  const pool = pools.find((p) => (p.fencers || []).some((f) => same(f.name)));
  const pf = pool?.fencers.find((f) => same(f.name));
  const bouts = matches
    .filter((m) => m.resultType !== 'CANCELLED' && (same(m.player1) || same(m.player2)))
    .sort((a, b) => rank(a.round) - rank(b.round))
    .map((m) => {
      const side = same(m.player1) ? 1 : 2;
      const opponent = side === 1 ? m.player2 : m.player1;
      const mine = side === 1 ? m.score1 : m.score2;
      const theirs = side === 1 ? m.score2 : m.score1;
      return {
        id: m.id,
        round: m.round,
        opponent: String(opponent || '').trim() || null,
        finished: Boolean(m.isFinished),
        won: m.isFinished ? m.winner === side : null,
        medical: m.resultType === 'MEDICAL_WITHDRAWAL',
        score: Number.isInteger(mine) && Number.isInteger(theirs) ? [mine, theirs] : null,
        strip: m.strip || null,
        startsAt: m.startsAt || null,
      };
    });
  const last = bouts.at(-1);
  let status;
  if (!last) {
    if (!pool) status = { kind: 'absent' };
    else if (pool.isFinal) status = { kind: 'waiting', label: 'Poule terminée' };
    else if ((pf.wins ?? 0) + (pf.losses ?? 0) > 0 || pf.firstResultAt) status = { kind: 'live', label: 'En poule' };
    else status = { kind: 'upcoming', label: 'Poule à venir' };
  } else if (!last.finished) status = { kind: 'next', label: 'En lice', bout: last };
  else if (last.won) {
    if (last.round === 'T2') status = { kind: 'medal', medal: 'gold', label: 'Médaille d’or' };
    else if (last.round === 'Bronze') status = { kind: 'medal', medal: 'bronze', label: 'Médaille de bronze' };
    else status = { kind: 'qualified', label: 'Qualifié', after: last.round };
  } else if (last.round === 'T2') status = { kind: 'medal', medal: 'silver', label: 'Médaille d’argent' };
  else if (last.round === 'T4' && !team) status = { kind: 'medal', medal: 'bronze', label: 'Médaille de bronze' };
  else if (last.round === 'T4' && team) status = { kind: 'qualified', label: 'Match pour le bronze', after: 'T4' };
  else if (last.round === 'Bronze') status = { kind: 'out', label: '4e place', round: 'Bronze' };
  else status = { kind: 'out', label: 'Éliminé', round: last.round };
  return {
    name,
    pool: pool
      ? {
          id: pool.id,
          name: pool.name,
          strip: pool.strip || null,
          startsAt: pool.startsAt || null,
          final: Boolean(pool.isFinal),
          bouts: (pool.fencers?.length || 1) - 1,
          wins: Number.isInteger(pf.wins) ? pf.wins : null,
          losses: Number.isInteger(pf.losses) ? pf.losses : null,
          indicator: Number.isInteger(pf.indicator) ? pf.indicator : null,
        }
      : null,
    bouts,
    status,
  };
}

// Tireurs du club présents dans l'épreuve : d'abord ceux encore en lice, les plus avancés en tête.
export function clubDay(clubFencers = [], pools = [], matches = [], options = {}) {
  const seen = new Set();
  const weight = { next: 0, live: 1, qualified: 2, medal: 3, waiting: 4, upcoming: 5, out: 6 };
  return clubFencers
    .filter((n) => {
      const k = normalizeName(n);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((n) => fencerDay(n, pools, matches, options))
    .filter((d) => d.status.kind !== 'absent')
    .sort(
      (a, b) =>
        weight[a.status.kind] - weight[b.status.kind] ||
        rank(b.bouts.at(-1)?.round) - rank(a.bouts.at(-1)?.round) ||
        a.name.localeCompare(b.name, 'fr'),
    );
}
