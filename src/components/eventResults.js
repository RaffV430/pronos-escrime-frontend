// Onglet « Résultats » : présentation des résultats sportifs des tournois passés (fonctions pures).

let names = null;
// Nom du pays en français à partir du code ISO (« FR » → « France »).
export function countryName(code) {
  if (!code) return '';
  try {
    names ||= new Intl.DisplayNames(['fr'], { type: 'region' });
    return names.of(code) || code;
  } catch {
    return code;
  }
}
// Drapeau emoji d'un code pays ISO à deux lettres.
export const flag = (code) =>
  /^[A-Z]{2}$/.test(code || '') ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '';

export const seasonLabel = (season) => `${season}-${season + 1}`;

const day = (iso) => new Date(`${iso}T12:00:00Z`);
const format = (iso, options) => day(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...options });
// « 4 octobre 2026 », « 3–4 octobre 2026 », « 31 janvier – 1 février 2026 ».
export function dateRange(start, end = start) {
  if (!start) return '';
  if (!end || end === start) return format(start, { day: 'numeric', month: 'long', year: 'numeric' });
  const [a, b] = [day(start), day(end)];
  if (a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth())
    return `${a.getUTCDate()}–${format(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  if (a.getUTCFullYear() === b.getUTCFullYear())
    return `${format(start, { day: 'numeric', month: 'long' })} – ${format(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  return `${format(start, { day: 'numeric', month: 'long', year: 'numeric' })} – ${format(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export const seasonsOf = (list) => [...new Set((list || []).map((t) => t.season))].sort((a, b) => b - a);
export const countriesOf = (list) =>
  [...new Set((list || []).flatMap((t) => t.countries || []))].sort((a, b) =>
    countryName(a).localeCompare(countryName(b), 'fr'),
  );

const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Filtres : saison (« all » = toutes), pays du lieu, recherche (tournoi, épreuve, ville ou médaillé), tri par date.
export function filterResults(list, { season = 'all', country = 'all', query = '', order = 'desc' } = {}) {
  const q = fold(query).trim();
  const rows = (list || []).filter(
    (t) =>
      (season === 'all' || t.season === Number(season)) &&
      (country === 'all' || (t.countries || []).includes(country)) &&
      (!q ||
        [t.name, t.city, ...t.competitions.flatMap((c) => [c.name, ...c.podium.map((p) => p.name)])].some((s) =>
          fold(s).includes(q),
        )),
  );
  const sorted = [...rows].sort((a, b) => a.start.localeCompare(b.start) || a.id - b.id);
  return order === 'asc' ? sorted : sorted.reverse();
}

export const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Score d'un match terminé, vainqueur en premier (« 15–8 »), ou mention du retrait.
export function resultText(m) {
  if (m.resultType === 'MEDICAL_WITHDRAWAL') return 'abandon';
  if (!Number.isInteger(m.score1) || !Number.isInteger(m.score2)) return '';
  return m.winner === 2 ? `${m.score2}–${m.score1}` : `${m.score1}–${m.score2}`;
}
// Matchs à afficher : rencontres réellement disputées (ni annulées, ni sans résultat).
export const playedMatches = (matches) =>
  (matches || []).filter((m) => m.resultType !== 'CANCELLED' && (m.isFinished || m.pointsPending));
