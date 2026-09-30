// Arbre du tableau façon FencingTimeLive : chaque tour a la même hauteur, ses cases sont réparties à
// parts égales, donc chaque match se centre entre les deux matchs d'où viennent ses tireurs.
// Les positions viennent du numéro officiel (sourceKey « …:n »), jamais de l'ordre d'affichage.

export const roundSize = (round) => (/^T\d+$/.test(round || '') ? Number(round.slice(1)) : null);
export const slotPosition = (m) => Number(m?.sourceKey?.match(/:(\d+)$/)?.[1]);
const winnerSide = (m) =>
  m?.winner === 1 || m?.winner === 2
    ? m.winner
    : Number.isInteger(m?.score1) && Number.isInteger(m?.score2) && m.score1 !== m.score2
      ? m.score1 > m.score2
        ? 1
        : 2
      : null;
// Tête de série officielle (entier positif) ou null.
export const seedOf = (m, n) => {
  const s = m?.[`seed${n}`];
  return Number.isInteger(s) && s > 0 ? s : null;
};
const side = (m, n) => ({
  name: m[`player${n}`],
  country: m[`player${n}Country`] || '',
  ...(seedOf(m, n) ? { seed: seedOf(m, n) } : {}),
});

// Vainqueur officiel d'un match terminé.
export function officialWinner(m) {
  if (!m?.isFinished) return null;
  const w = winnerSide(m);
  return w ? side(m, w) : null;
}

// Vainqueur d'après un pronostic { score1, score2 } complet et valide, sinon null.
export function predictedWinner(m, value) {
  const a = String(value?.score1 ?? ''),
    b = String(value?.score2 ?? '');
  if (!/^\d{1,2}$/.test(a) || !/^\d{1,2}$/.test(b) || Number(a) === Number(b)) return null;
  return side(m, Number(a) > Number(b) ? 1 : 2);
}

// Tours du tableau (T64, T32… T2) ; null si les positions officielles ne permettent pas un arbre fiable.
export function buildTree(matches) {
  const active = matches.filter((m) => m.resultType !== 'CANCELLED');
  const tableau = active.filter((m) => roundSize(m.round));
  if (!tableau.length) return null;
  const sizes = [...new Set(tableau.map((m) => roundSize(m.round)))];
  const first = Math.max(...sizes);
  if (!Number.isInteger(Math.log2(first)) || first < 2) return null;
  const rounds = [];
  for (let n = first; n >= 2; n /= 2) {
    const items = tableau.filter((m) => roundSize(m.round) === n);
    const positions = items.map(slotPosition);
    if (
      positions.some((p) => !Number.isInteger(p) || p < 1 || p > n / 2) ||
      new Set(positions).size !== positions.length
    )
      return null;
    rounds.push({ round: `T${n}`, size: n, byPosition: new Map(items.map((m) => [slotPosition(m), m])) });
  }
  const bronze = active.filter((m) => m.round === 'Bronze');
  return {
    base: first / 2,
    rounds: rounds.map((r, index) => ({
      round: r.round,
      size: r.size,
      slots: Array.from({ length: r.size / 2 }, (_, i) => {
        const pos = i + 1,
          match = r.byPosition.get(pos) || null;
        return { pos, match, advance: match ? null : advanceFor(rounds, index, pos) };
      }),
    })),
    bronze: bronze.length === 1 ? bronze[0] : null,
  };
}

// Case vide dont le tireur est déjà connu au tour suivant (exempt au premier tour, qualifié ensuite).
function advanceFor(rounds, index, pos) {
  const next = rounds[index + 1]?.byPosition.get(Math.ceil(pos / 2));
  if (!next) return null;
  const siblingPos = pos % 2 ? pos + 1 : pos - 1;
  const sibling = rounds[index].byPosition.get(siblingPos);
  const players = [side(next, 1), side(next, 2)];
  if (!sibling) return pos % 2 ? players[0] : players[1];
  const fromSibling = officialWinner(sibling)?.name;
  if (!fromSibling) return null;
  const rest = players.filter((p) => p.name !== fromSibling);
  return rest.length === 1 ? rest[0] : null;
}

// Tireur attendu dans une case d'un tour à venir, venant de la case `pos` du tour précédent.
// kind : 'real' (connu officiellement), 'pick' (votre qualifié d'après votre pronostic), 'tbd'.
export function entrantFrom(tree, roundIndex, pos, valueOf) {
  const prev = tree.rounds[roundIndex - 1];
  const label = `Vainqueur ${prev.round} n°${pos}`;
  const slot = prev.slots[pos - 1];
  if (!slot) return { kind: 'tbd', name: label };
  if (slot.advance) return { kind: 'real', ...slot.advance };
  const m = slot.match;
  if (!m) return { kind: 'tbd', name: label };
  const official = officialWinner(m);
  if (official) return { kind: 'real', ...official };
  const pick = predictedWinner(m, valueOf(m));
  return pick ? { kind: 'pick', ...pick } : { kind: 'tbd', name: label };
}
