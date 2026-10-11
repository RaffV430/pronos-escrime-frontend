// Administration en rubriques : une seule rubrique affichée à la fois, pour ne plus se perdre
// dans une longue page de menus imbriqués.
export const ADMIN_SECTIONS = [
  ['event', 'Épreuve', 'Suivi, matchs, poules, vérifications et points d’une épreuve'],
  ['tournaments', 'Tournois et calendrier', 'Préparer un tournoi, calendrier automatique, circuits'],
  ['clubs', 'Clubs et tireurs', 'Demandes de clubs, responsables, clubs des tireurs'],
  ['sync', 'Suivi des sites officiels', 'État des contrôles FencingTimeLive et engarde'],
  ['journal', 'Journal', 'Dernières actions d’administration'],
];
const KEY = 'pronos:admin-section';

export function sectionForDestination(destination) {
  return destination?.panel === 'clubs' ? 'clubs' : destination?.panel === 'sync' ? 'sync' : null;
}
export function storedSection() {
  try {
    const value = localStorage.getItem(KEY);
    return ADMIN_SECTIONS.some(([id]) => id === value) ? value : null;
  } catch {
    return null;
  }
}
export function storeSection(section) {
  try {
    localStorage.setItem(KEY, section);
  } catch {
    /* Préférence d'affichage seulement. */
  }
}
