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
export const NAV_MIN = 3;
export const NAV_MAX = 5;
const known = new Set(NAV_CATALOG.map(([id]) => id));

export function readNav() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(list)) {
      const clean = [...new Set(list.filter((id) => known.has(id)))].slice(0, NAV_MAX);
      if (clean.length >= NAV_MIN) return clean;
    }
  } catch {
    /* préférence illisible : barre par défaut */
  }
  return NAV_DEFAULT;
}

export function saveNav(list) {
  try {
    if (list) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch {
    /* préférence non gardée */
  }
}
