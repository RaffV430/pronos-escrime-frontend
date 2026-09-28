// Filtres et libellés de l'historique de saison (fonctions pures, testées).
export const SEASON_FILTERS = [
  ['all', 'Tous'],
  ['scored', 'Points marqués'],
  ['exact', 'Scores exacts'],
  ['miss', 'Ratés'],
  ['pending', 'En attente'],
];

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function rowMatches(row, filter, query = '') {
  const byFilter =
    filter === 'all' || (filter === 'scored' && ['exact', 'points'].includes(row.outcome)) || row.outcome === filter;
  const q = normalize(query);
  return byFilter && (!q || normalize(`${row.name} ${row.prediction || ''}`).includes(q));
}

// Garde la structure tournoi → épreuve en retirant les lignes et les groupes vides.
export function filterSeason(tournaments, filter, query) {
  return (tournaments || [])
    .map((t) => ({
      ...t,
      competitions: t.competitions
        .map((c) => ({ ...c, rows: c.rows.filter((r) => rowMatches(r, filter, query)) }))
        .filter((c) => c.rows.length),
    }))
    .filter((t) => t.competitions.length);
}

export const OUTCOME_LABELS = {
  exact: 'Exact',
  points: 'Points',
  miss: 'Raté',
  pending: 'En attente',
  cancelled: 'Annulé',
};

export const signedPoints = (n) => (n > 0 ? `+${n}` : String(n));
