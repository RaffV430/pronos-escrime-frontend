// Découpage du tableau en quarts, d'après les numéros de match officiels.
// Un quart regroupe n/8 rencontres d'un tour Tn (n >= 8) : T32 → 4, T16 → 2, T8 → 1.
// Les demi-finales, la finale et le match pour le bronze forment la section « finals ».
const FINAL_ROUNDS = new Set(['T4', 'T2', 'Bronze']);

function slotNumber(match) {
  const slot = Number(/:(\d+)$/.exec(match?.sourceKey || '')?.[1]);
  return Number.isInteger(slot) && slot > 0 ? slot : null;
}

export function bracketSection(match) {
  const round = match?.round;
  if (FINAL_ROUNDS.has(round)) return 'finals';
  const size = Number(/^T(\d+)$/.exec(round || '')?.[1]);
  const slot = slotNumber(match);
  if (!Number.isInteger(size) || size < 8 || !slot || slot > size / 2) return 'other';
  return String(Math.ceil(slot / (size / 8)));
}

export function sectionGroups(groups, section) {
  if (!section || section === 'all') return groups;
  return groups
    .map(group => ({ ...group, items: group.items.filter(match => bracketSection(match) === section) }))
    .filter(group => group.items.length > 0);
}
