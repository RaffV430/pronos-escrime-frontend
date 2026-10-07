// Une adresse par section de l'application (retour arrière, rechargement, liens partagés ou en favori).
export const TAB_PATHS = {
  play: '/pronostiquer',
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
// « / » est la page d'accueil ; un joueur connecté y est renvoyé vers « Pronostiquer » (anciens liens et
// notifications compris, avec leurs paramètres).
const BY_PATH = { '/': 'play', ...Object.fromEntries(Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab])) };
// Section correspondant à une adresse (y compris ses sous-adresses : /pronostiquer/<tournoi>/<épreuve>) ;
// null pour les autres pages (tournoi public, pages légales…).
export function tabFromPath(pathname) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  return BY_PATH[path] || BY_PATH[`/${path.split('/')[1]}`] || null;
}
export const pathForTab = (tab) => TAB_PATHS[tab] || '/';

// « Étampes CN M17/M20 » → « etampes-cn-m17-m20 » (lisible ; le numéro reste la référence).
export function slug(name) {
  return (
    String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || ''
  );
}
// Segment d'adresse : « etampes-cn-m17-m20-4 » (ou « 4 » sans nom).
export const segment = (name, id) => (slug(name) ? `${slug(name)}-${id}` : String(id));
// Numéro d'un segment : « etampes-cn-m17-m20-4 » → 4, « 4 » → 4.
export function idOf(seg) {
  const id = Number(/(?:^|-)(\d+)$/.exec(String(seg || ''))?.[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Vues de « Pronostiquer » dans l'adresse.
const VIEWS = { tableau: 'tableau', poules: 'pools', podium: 'podium', 'nos-tireurs': 'club' };
const VIEW_PATHS = Object.fromEntries(Object.entries(VIEWS).map(([path, view]) => [view, path]));

// Lecture d'une adresse : section, tournoi, épreuve et vue. Les anciens liens (?tournament=…&event=…&view=…)
// restent compris.
export function parseLocation(pathname, search = '') {
  const parts = String(pathname || '/')
    .split('/')
    .filter(Boolean);
  const tab = tabFromPath(pathname);
  const query = new URLSearchParams(search);
  const legacyView = query.get('view');
  const legacy = {
    tournamentId: idOf(query.get('tournament')),
    eventId: idOf(query.get('event')),
    view: legacyView === 'pools' ? 'pools' : legacyView === 'podium' ? 'podium' : null,
  };
  if (!tab || parts.length < 2) return { tab, ...legacy };
  return {
    tab,
    tournamentId: idOf(parts[1]),
    eventId: idOf(parts[2]),
    view: VIEWS[parts[3]] || null,
  };
}

// Adresse d'une section, avec son tournoi, son épreuve et sa vue quand ils sont connus.
export function pathFor(tab, { tournament = null, event = null, view = null } = {}) {
  let path = pathForTab(tab);
  if (!tournament?.id) return path;
  path += `/${segment(tournament.name, tournament.id)}`;
  if (!event?.id) return path;
  path += `/${segment(event.name, event.id)}`;
  if (view && VIEW_PATHS[view]) path += `/${VIEW_PATHS[view]}`;
  return path;
}

// Page publique d'un tournoi ou d'une de ses épreuves.
export const publicPath = (tournament, event = null) =>
  `/tournoi/${segment(tournament?.name, tournament?.id)}${event?.id ? `/${segment(event.name, event.id)}` : ''}`;
