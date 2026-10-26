// Nouvelle navigation : seule navigation de l'application (octobre 2026). L'ancien choix « ancienne navigation »
// gardé sur certains appareils est effacé ; ?nav=1 n'a plus d'effet.
const KEY = 'pronos:navigation-choice';

export function nav2On() {
  try {
    if (localStorage.getItem(KEY) !== null) localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : rien à effacer */
  }
  return true;
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
