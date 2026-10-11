// Filtres « pour rire » de « Mes pronostics ». Les étiquettes (tags) et l'écart de touches (scoreGap)
// sont calculés par le serveur sur les matchs terminés ; « Carton rouge » montre les plus gros écarts.
export const FUN_FILTERS = [
  { id: 'exact', label: 'Dans le mille', emoji: '🎯', hint: 'Score exact' },
  { id: 'near', label: 'À deux doigts', emoji: '🤏🏻', hint: 'Chaque score à une touche près' },
  { id: 'oops', label: 'Oops', emoji: '🔄', hint: 'Score exactement inversé' },
  { id: 'poker', label: 'Coup de poker', emoji: '🃏', hint: 'Bon vainqueur, le moins bien classé des deux' },
  { id: 'wire', label: 'Sur le fil', emoji: '😮‍💨', hint: 'Bon vainqueur d’un match gagné d’une touche' },
  { id: 'red', label: 'Carton rouge', emoji: '🟥', hint: 'Vos plus gros écarts de touches' },
];
export const RED_CARDS = 5;

// Plus gros écarts : les 5 premiers, ex æquo compris, à partir de 6 touches d'écart.
export function redCards(rows, limit = RED_CARDS) {
  const scored = rows.filter((r) => Number.isInteger(r.scoreGap) && r.scoreGap >= 6);
  scored.sort((a, b) => b.scoreGap - a.scoreGap);
  if (scored.length <= limit) return scored;
  const floor = scored[limit - 1].scoreGap;
  return scored.filter((r) => r.scoreGap >= floor);
}

export function funRows(rows, id) {
  if (id === 'red') return redCards(rows);
  return rows.filter((r) => r.tags?.includes(id));
}

export const funCounts = (rows) => Object.fromEntries(FUN_FILTERS.map((f) => [f.id, funRows(rows, f.id).length]));
