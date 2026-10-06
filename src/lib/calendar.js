// Présentation du calendrier des épreuves (dates, catégories, hommes / dames).
export const GENDERS = {
  HD: { icon: '♂♀', short: 'Hommes et dames', label: 'Épreuve hommes et dames' },
  H: { icon: '♂', short: 'Hommes', label: 'Épreuve hommes seulement' },
  F: { icon: '♀', short: 'Dames', label: 'Épreuve dames seulement' },
};
const CATEGORIES = { SENIOR: 'Seniors', M20: 'M20 (juniors)', M17: 'M17 (cadets)', M15: 'M15', M13: 'M13' };
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const parts = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d };
};

// « 17–18 oct. », « 30 janv. – 1 févr. », « 10 oct. »
export function calendarDates(start, end) {
  const a = parts(start),
    b = parts(end || start);
  if (a.y === b.y && a.m === b.m && a.d === b.d) return `${a.d} ${MONTHS[a.m - 1]}`;
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]}`;
  return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]}`;
}
export const monthLabel = (iso) => {
  const { y, m } = parts(iso);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};
export function calendarCategories(cats = []) {
  const list = cats.filter((c) => !c.startsWith('V')).map((c) => CATEGORIES[c] || c);
  if (cats.some((c) => c.startsWith('V'))) list.push('Vétérans');
  return list;
}
export const calendarFormat = (format) =>
  format === 'TEAM' ? 'Équipes' : format === 'BOTH' ? 'Individuel et équipes' : 'Individuel';
