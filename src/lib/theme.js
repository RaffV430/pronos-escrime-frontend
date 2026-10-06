// Apparence choisie dans « Mon compte » : automatique (réglage du téléphone ou de l'ordinateur), claire ou
// sombre. Le thème sombre est écrit en CSS sous @media (prefers-color-scheme: dark) ; un choix forcé
// réécrit ces conditions dans les feuilles chargées (y compris celles chargées plus tard).
const KEY = 'pronos:theme';
export const THEMES = ['auto', 'light', 'dark'];
const ALWAYS = '(min-width: 0px)';
const NEVER = '(max-width: 0px)';
const SCHEME = /\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/g;

let current = 'auto';
let watching = false;
const originals = new WeakMap();

export function storedTheme() {
  try {
    const value = localStorage.getItem(KEY);
    return THEMES.includes(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

// Condition d'origine → condition appliquée au thème choisi.
export function rewriteMedia(text, theme) {
  if (theme === 'auto') return text;
  return text.replace(SCHEME, (_, scheme) => (scheme === theme ? ALWAYS : NEVER));
}

function walk(rules) {
  for (const rule of rules) {
    if (rule.media && rule.cssRules) {
      if (!originals.has(rule) && /prefers-color-scheme/.test(rule.media.mediaText))
        originals.set(rule, rule.media.mediaText);
      const original = originals.get(rule);
      if (original !== undefined) {
        const next = rewriteMedia(original, current);
        if (rule.media.mediaText !== next) rule.media.mediaText = next;
      }
    }
    if (rule.cssRules) walk(rule.cssRules);
  }
}

function apply() {
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // feuille d'un autre domaine : illisible, et sans thème sombre
    }
    walk(rules);
  }
  for (const meta of document.querySelectorAll('meta[name="theme-color"][media]')) {
    if (!meta.dataset.media) meta.dataset.media = meta.getAttribute('media');
    meta.setAttribute('media', current === 'auto' ? meta.dataset.media : rewriteMedia(meta.dataset.media, current));
  }
  document.documentElement.dataset.theme = current;
}

// Feuilles ajoutées après coup (sections chargées à la demande) : même réglage.
function watch() {
  if (watching || typeof MutationObserver === 'undefined') return;
  watching = true;
  new MutationObserver((changes) => {
    for (const change of changes)
      for (const node of change.addedNodes)
        if (node.nodeName === 'LINK') node.addEventListener('load', apply, { once: true });
    apply();
  }).observe(document.head, { childList: true, subtree: true, characterData: true });
}

export function setTheme(theme) {
  current = THEMES.includes(theme) ? theme : 'auto';
  try {
    if (current === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, current);
  } catch {
    /* Le choix vaut pour cette visite. */
  }
  apply();
  watch();
}

export function initTheme() {
  current = storedTheme();
  if (current === 'auto') return;
  apply();
  watch();
  // Feuilles encore en cours de chargement au démarrage.
  window.addEventListener('load', apply, { once: true });
}
