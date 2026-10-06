// Une adresse par section de l'application (retour arrière, rechargement, liens partagés ou en favori).
export const TAB_PATHS = {
  play: '/',
  mine: '/mes-pronostics',
  season: '/ma-saison',
  results: '/resultats',
  leaderboard: '/classements',
  community: '/communaute',
  account: '/compte',
  admin: '/admin',
};
export const TAB_TITLES = {
  play: 'Pronostiquer',
  mine: 'Mes pronostics',
  season: 'Ma saison',
  results: 'Résultats des compétitions d’escrime',
  leaderboard: 'Classements',
  community: 'Communauté',
  account: 'Mon compte',
  admin: 'Administration',
};
const BY_PATH = Object.fromEntries(Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab]));
// Section correspondant à une adresse ; null pour les autres pages (tournoi public, pages légales…).
export function tabFromPath(pathname) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  return BY_PATH[path] || null;
}
export const pathForTab = (tab) => TAB_PATHS[tab] || '/';
