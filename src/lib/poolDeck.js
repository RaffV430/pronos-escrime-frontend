// Pronostics de poule « une poule par écran » (téléphone) : un toucher par tireur pour les victoires, indice
// facultatif en valeurs rapides, contrôle du total de la poule et avancement.

// Valeurs d'indice proposées d'un toucher (le barème donne des points jusqu'à 5 touches d'écart).
export const QUICK_INDICATORS = [-15, -10, -5, 0, 5, 10, 15];

// Bornes de l'indice pour un nombre de victoires (poule en 5 touches), comme la saisie détaillée.
export function indicatorBounds(wins, bouts) {
  if (!Number.isInteger(wins)) return { min: -5 * bouts, max: 5 * bouts };
  const losses = bouts - wins;
  return { min: wins - 5 * losses, max: 5 * wins - losses };
}
// Valeurs rapides possibles pour ce nombre de victoires (bornes comprises, ajoutées si besoin).
export function quickIndicators(wins, bouts) {
  const { min, max } = indicatorBounds(wins, bouts);
  const inside = QUICK_INDICATORS.filter((v) => v >= min && v <= max);
  return [
    ...new Set([
      ...(min > -15 && !inside.includes(min) ? [min] : []),
      ...inside,
      ...(max < 15 && !inside.includes(max) ? [max] : []),
    ]),
  ].sort((a, b) => a - b);
}
export const fitsIndicator = (indicator, wins, bouts) => {
  if (indicator == null) return true;
  const { min, max } = indicatorBounds(wins, bouts);
  return indicator >= min && indicator <= max;
};

// Tireurs pronostiquables (hors absents, retirés ou exclus).
export const activeFencers = (pool) => pool.fencers.filter((f) => !f.status);

// Contrôle du total : une poule complète de n tireurs compte n(n−1)/2 victoires. Avec un tireur sorti, le total
// officiel change : pas de contrôle.
export function poolTotals(pool, picks) {
  const active = activeFencers(pool);
  const filled = active.filter((f) => Number.isInteger(picks[f.id]?.wins));
  const sum = filled.reduce((s, f) => s + picks[f.id].wins, 0);
  const expected = active.length === pool.fencers.length ? (active.length * (active.length - 1)) / 2 : null;
  const complete = active.length > 0 && filled.length === active.length;
  return {
    filled: filled.length,
    count: active.length,
    sum,
    expected,
    complete,
    status: !complete ? 'partial' : expected === null || sum === expected ? 'ok' : 'check',
  };
}

// Poule faite : chaque tireur encore ouvert a un nombre de victoires.
export const poolDone = (pool, picks, isOpen = () => true) =>
  activeFencers(pool)
    .filter(isOpen)
    .every((f) => Number.isInteger(picks[f.id]?.wins));

// Ordre des poules : mes tireurs d'abord si demandé, sinon l'ordre des poules (1, 2… 10).
export function deckOrder(pools, { mineFirst = false, hasMine = () => false } = {}) {
  const sorted = [...pools].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  return mineFirst ? [...sorted.filter(hasMine), ...sorted.filter((p) => !hasMine(p))] : sorted;
}

// Pronostics enregistrés d'une liste de poules : { [fencerId]: { wins, indicator } }.
export const picksFrom = (pools) =>
  Object.fromEntries(
    pools.flatMap((p) =>
      p.fencers
        .filter((f) => f.prediction)
        .map((f) => [f.id, { wins: f.prediction.wins, indicator: f.prediction.indicator ?? null }]),
    ),
  );

// Classement d'un tireur : celui saisi pour la poule s'il existe, sinon son rang d'entrée dans l'épreuve.
export function fencerRank(pool, fencer) {
  if (pool.rankingSystem && Number.isInteger(fencer.ranking) && fencer.ranking > 0) return fencer.ranking;
  return Number.isInteger(fencer.entryRanking) && fencer.entryRanking > 0 ? fencer.entryRanking : null;
}
