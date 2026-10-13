// Langue de l'interface : choix mémorisé sur l'appareil, sinon langue de l'appareil (français si elle
// commence par « fr », anglais sinon). Le français reste la langue de référence du site.
const KEY = 'pronos:lang';
export const LANGS = ['fr', 'en'];

export function detectLanguage(
  languages = typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language],
) {
  const first = String((languages || []).find(Boolean) || 'fr').toLowerCase();
  return first.startsWith('fr') ? 'fr' : 'en';
}

export function initialLanguage() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* stockage indisponible : langue de l'appareil */
  }
  return detectLanguage();
}

export function saveLanguage(lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* choix non mémorisé */
  }
}

export const localeOf = (lang) => (lang === 'en' ? 'en-GB' : 'fr-FR');
