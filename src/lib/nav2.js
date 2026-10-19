// Navigation par défaut ; ?nav=1 permet un retour temporaire à l’ancienne.
// Le choix reste propre à cet appareil.
const KEY = 'pronos:navigation-choice';

export function nav2On() {
  const asked = new URLSearchParams(location.search).get('nav');
  if (asked === '1' || asked === '2') {
    try {
      localStorage.setItem(KEY, asked);
    } catch {
      /* URL reste prioritaire */
    }
    return asked === '2';
  }
  try {
    return localStorage.getItem(KEY) !== '1';
  } catch {
    return true;
  }
}

export function setNav2(on) {
  try {
    localStorage.setItem(KEY, on ? '2' : '1');
  } catch {
    /* URL reste utilisable */
  }
  const url = new URL(location.href);
  url.searchParams.set('nav', on ? '2' : '1');
  if (!on && /^\/mon-espace\/?$/.test(url.pathname)) url.pathname = '/compte';
  location.replace(url.pathname + url.search + url.hash);
}

// Barre du bas par défaut (personnalisable) ; « Mon espace » s'ouvre depuis le nom du joueur, en haut.
export const NAV2_TABS = ['home', 'play', 'live', 'leaderboard', 'me'];
// Sections rangées dans « Mon espace » (l'onglet reste allumé quand on y est).
export const HUB_SECTIONS = [
  ['mine', 'Mes pronostics', 'Tous vos pronostics, épreuve par épreuve'],
  ['season', 'Ma saison', 'Points, progression et badges'],
  ['me', 'Mes tireurs', 'Vos favoris et leurs prochains assauts'],
  ['community', 'Délégations & club', 'Vos groupes, invitations et défis'],
  ['account', 'Compte & notifications', 'Profil, alertes, installation, sécurité'],
];
// Sections générales : celles retirées de la barre restent accessibles depuis « Mon espace ».
export const OTHER_SECTIONS = [
  ['play', 'Pronostiquer', 'Les épreuves ouvertes aux pronostics'],
  ['live', 'Direct', 'Suivre une épreuve et revoir les résultats'],
  ['leaderboard', 'Classements', 'Joueurs et clubs'],
];
export const otherSections = (tabs = []) => OTHER_SECTIONS.filter(([id]) => !tabs.includes(id));
const HUB_IDS = new Set(['hub', ...HUB_SECTIONS.map(([id]) => id)]);
// Onglet de la barre à allumer pour une section.
// Une section présente dans la barre s'allume elle-même ; sinon « Mon espace » si le joueur l'a mis dans la barre.
export function nav2Active(tab, tabs = NAV2_TABS) {
  if (tab === 'results') return 'live';
  if (tabs.includes(tab)) return tab;
  if (HUB_IDS.has(tab)) return 'hub';
  return tab;
}
