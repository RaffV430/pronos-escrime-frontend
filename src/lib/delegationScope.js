export const scopeLabels = {
  ALL: 'Tout : poules, tableau et podium',
  TABLEAU: 'Matchs de tableau uniquement',
  PODIUM: 'Podium uniquement',
};
export function predictionTabs(scope = 'ALL', team = false) {
  if (scope === 'TABLEAU') return [['tableau', 'Tableau']];
  if (scope === 'PODIUM') return [['podium', 'Podium']];
  return [...(!team ? [['pools', 'Poules']] : []), ['tableau', 'Tableau'], ['podium', 'Podium']];
}
