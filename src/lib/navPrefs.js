// Barre de navigation personnalisable (aperçu de la refonte) : le joueur choisit 3 à 5 onglets.
// Gardé sur cet appareil ; une version en ligne l'enregistrerait dans le compte.
const KEY = 'pronos:nav-tabs';
export const NAV_CATALOG = [
  ['home', 'Accueil'],
  ['live', 'Direct'],
  ['play', 'Pronostiquer'],
  ['mine', 'Mes pronos'],
  ['leaderboard', 'Classements'],
  ['me', 'Mes tireurs'],
  ['community', 'Délégations'],
];
export const NAV_DEFAULT = ['home', 'play', 'mine', 'leaderboard', 'me'];
// Maquette navigation 2 : « Mon espace » peut aussi être mis dans la barre ; préférence gardée à part.
export const NAV2_CATALOG = [...NAV_CATALOG, ['hub', 'Mon espace']];
export const NAV2_KEY = 'pronos:nav-tabs-2';
export const NAV_MIN = 3;
export const NAV_MAX = 5;

export function readNav(fallback = NAV_DEFAULT, catalog = NAV_CATALOG, key = KEY) {
  const known = new Set(catalog.map(([id]) => id));
  try {
    const list = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(list)) {
      // Accueil est obligatoire et toujours en tête (en haut sur ordinateur, au centre sur mobile).
      const clean = ['home', ...new Set(list.filter((id) => known.has(id) && id !== 'home'))].slice(0, NAV_MAX);
      if (clean.length >= NAV_MIN) return clean;
    }
  } catch {
    /* préférence illisible : barre par défaut */
  }
  return fallback;
}

export function saveNav(list, key = KEY) {
  try {
    if (list) localStorage.setItem(key, JSON.stringify(list));
    else localStorage.removeItem(key);
  } catch {
    /* préférence non gardée */
  }
}

// Mobile : Accueil au centre de la barre. Avec un nombre impair d'autres onglets, un bouton « Plus »
// (menu du compte) équilibre les deux côtés. Renvoie l'ordre d'affichage mobile de chaque onglet.
export function mobileSlots(ids) {
  const others = ids.filter((id) => id !== 'home');
  if (others.length % 2) others.push('more');
  const half = others.length / 2;
  const order = [...others.slice(0, half), 'home', ...others.slice(half)];
  return Object.fromEntries(order.map((id, i) => [id, i]));
}
