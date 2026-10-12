export const sectionChoices = { POOLS: 'Poules', TABLEAU: 'Tableau', PODIUM: 'Podium' };
export const selectedSections = (scope = 'ALL') => (scope === 'ALL' ? Object.keys(sectionChoices) : scope.split(','));
export function toggleSection(scope, section) {
  const selected = new Set(selectedSections(scope));
  if (selected.has(section)) selected.delete(section);
  else selected.add(section);
  if (!selected.size) return scope;
  const sections = Object.keys(sectionChoices).filter((key) => selected.has(key));
  return sections.length === 3 ? 'ALL' : sections.join(',');
}
export const scopeLabels = Object.fromEntries(
  ['ALL', 'POOLS', 'TABLEAU', 'PODIUM', 'POOLS,TABLEAU', 'POOLS,PODIUM', 'TABLEAU,PODIUM'].map((scope) => [
    scope,
    selectedSections(scope)
      .map((section) => sectionChoices[section])
      .join(' / '),
  ]),
);
export function predictionTabs(scope = 'ALL', team = false) {
  const selected = selectedSections(scope);
  return [
    ['POOLS', 'pools'],
    ['TABLEAU', 'tableau'],
    ['PODIUM', 'podium'],
  ]
    .filter(([key]) => selected.includes(key) && !(team && key === 'POOLS'))
    .map(([key, tab]) => [tab, sectionChoices[key]]);
}
