// Saisie de l'indice de poule : le clavier numérique Android n'a pas de signe « - »,
// on accepte donc un champ texte numérique et un bouton qui inverse le signe.
export function toggleSign(value) {
  const text = String(value ?? '').trim();
  if (text.startsWith('-')) return text.slice(1);
  return '-' + text.replace(/^\+/, '');
}

// Nombre entier signé, ou null si la saisie est vide ou incomplète (« - » seul).
export function parseIndicator(value) {
  const text = String(value ?? '')
    .trim()
    .replace(/^[−–]/, '-'); // signes moins typographiques collés depuis un autre clavier
  if (!/^[+-]?\d{1,3}$/.test(text)) return null;
  return Number(text);
}

// optional : pronostic simplifié, l'indice peut rester vide (victoires seules).
export function indicatorError(value, minimum, maximum, optional = false) {
  if (String(value ?? '').trim() === '') return optional ? '' : 'Indice requis.';
  const n = parseIndicator(value);
  if (n === null) return 'Indice : nombre entier, négatif si besoin (bouton ±).';
  if (n < minimum || n > maximum) return `Indice entre ${minimum} et ${maximum}.`;
  return '';
}
