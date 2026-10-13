import fr from './fr.js';
import en from './en.js';

const DICTIONARIES = { fr, en };

// Texte d'une clé dans une langue ; repli sur le français si la traduction manque.
export function translate(lang, key, vars) {
  let text = DICTIONARIES[lang]?.[key];
  if (text === undefined) {
    if (import.meta.env?.DEV && lang !== 'fr') console.warn(`Traduction manquante (${lang}) : ${key}`);
    text = fr[key] ?? key;
  }
  if (typeof text === 'function') return text(vars || {});
  return vars ? String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`) : text;
}
