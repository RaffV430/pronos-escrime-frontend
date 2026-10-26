// Nouveau design : seule présentation de l'application (octobre 2026). L'ancien choix « ancien design » gardé sur
// certains appareils est effacé ; ?refonte=0 n'a plus d'effet.
const KEY = 'pronos:refonte';

export function refonteOn() {
  try {
    if (localStorage.getItem(KEY) !== null) localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : rien à effacer */
  }
  return true;
}
