// Maquette « navigation 2 » : ?nav=2 l'active sur cet appareil, ?nav=1 revient à la navigation actuelle.
// Simple aperçu à tester : rien ne change pour les autres joueurs tant qu'elle n'est pas activée chez eux.
const KEY = 'pronos:nav2';

export function nav2On() {
  try {
    const asked = new URLSearchParams(location.search).get('nav');
    if (asked === '2') localStorage.setItem(KEY, '1');
    if (asked === '1') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setNav2(on) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* préférence non gardée */
  }
  const url = new URL(location.href);
  url.searchParams.delete('nav');
  location.replace(url.pathname + url.search + url.hash);
}

// Barre du bas : cinq destinations fixes, chacune avec une seule mission.
export const NAV2_TABS = ['home', 'play', 'live', 'leaderboard', 'hub'];
// Sections rangées dans « Mon espace » (l'onglet reste allumé quand on y est).
export const HUB_SECTIONS = [
  ['mine', 'Mes pronostics', 'Tous vos pronostics, épreuve par épreuve'],
  ['season', 'Ma saison', 'Points, progression et badges'],
  ['me', 'Mes tireurs', 'Vos favoris et leurs prochains assauts'],
  ['community', 'Délégations & club', 'Vos groupes, invitations et défis'],
  ['account', 'Compte & notifications', 'Profil, alertes, installation, sécurité'],
];
const HUB_IDS = new Set(['hub', ...HUB_SECTIONS.map(([id]) => id)]);
// Onglet de la barre à allumer pour une section.
export function nav2Active(tab) {
  if (HUB_IDS.has(tab)) return 'hub';
  if (tab === 'results') return 'live';
  return tab;
}
