// Nouveau design par défaut ; choix temporaire mémorisé sur cet appareil : ?refonte=1 l'active sur cet appareil, ?refonte=0 revient à l'ancien design.
const KEY = 'pronos:refonte';

export function refonteOn() {
  try {
    const asked = new URLSearchParams(location.search).get('refonte');
    if (asked === '1') localStorage.setItem(KEY, '1');
    if (asked === '0') localStorage.setItem(KEY, '0');
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setRefonte(on) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.setItem(KEY, '0');
  } catch {
    /* préférence non gardée */
  }
  const url = new URL(location.href);
  url.searchParams.delete('refonte');
  location.replace(url.pathname + url.search + url.hash);
}
