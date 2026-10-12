// Aperçu de la refonte : ?refonte=1 l'active sur cet appareil, ?refonte=0 revient à l'ancien design.
const KEY = 'pronos:refonte';

export function refonteOn() {
  // Uniquement en développement local : jamais sur le site en ligne tant que la refonte n'est pas validée.
  if (!import.meta.env.DEV) return false;
  try {
    const asked = new URLSearchParams(location.search).get('refonte');
    if (asked === '1') localStorage.setItem(KEY, '1');
    if (asked === '0') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setRefonte(on) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* préférence non gardée */
  }
  const url = new URL(location.href);
  url.searchParams.delete('refonte');
  location.replace(url.pathname + url.search + url.hash);
}
