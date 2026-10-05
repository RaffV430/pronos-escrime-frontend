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

// Nom d'un tour en toutes lettres : « Tableau de 64 », « Quarts de finale », « Demi-finales »…
export function roundName(round) {
  const n = Number(/^T(\d+)$/.exec(round || '')?.[1]);
  if (n === 2) return 'Finale';
  if (n === 4) return 'Demi-finales';
  if (n === 8) return 'Quarts de finale';
  if (n >= 16) return `Tableau de ${n}`;
  if (round === 'Bronze') return 'Match pour la 3e place';
  return round || '';
}
// Ville seule (« Veszprém, Veszprém megye, Hongrie » → « Veszprém ») : le pays est affiché à part.
export const cityName = (city) =>
  String(city || '')
    .split(',')[0]
    .trim();
// Nom court d'un tour pour les onglets du tableau (« T64 », « Quarts », « Demies », « Finale »).
export function shortRoundName(round) {
  const n = Number(/^T(\d+)$/.exec(round || '')?.[1]);
  if (n === 2) return 'Finale';
  if (n === 4) return 'Demies';
  if (n === 8) return 'Quarts';
  if (n >= 16) return `T${n}`;
  if (round === 'Bronze') return '3e place';
  return round || '';
}
// Classement d'une poule : victoires, puis indice, puis touches données ; rang officiel s'il est publié.
export function poolStanding(fencers) {
  return [...(fencers || [])].sort(
    (a, b) =>
      (a.ranking ?? Infinity) - (b.ranking ?? Infinity) ||
      (b.wins ?? -1) - (a.wins ?? -1) ||
      (b.indicator ?? -999) - (a.indicator ?? -999) ||
      a.position - b.position,
  );
}
// Tours de poules : « Poule 3 » au tour 1, « Tour 2 · Poule 1 »… regroupées par tour.
export function poolRounds(pools) {
  const groups = new Map();
  for (const p of pools || []) {
    const round = Number(/^Tour (\d+) · /.exec(p.name)?.[1]) || 1;
    if (!groups.has(round)) groups.set(round, []);
    groups.get(round).push(p);
  }
  return [...groups]
    .sort(([a], [b]) => a - b)
    .map(([round, items]) => ({
      round,
      pools: items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr', { numeric: true })),
    }));
}
// Nom compact pour petits écrans : « MONTI Lucrezia » → « MONTI L. », équipes et noms courts inchangés.
export function shortName(name) {
  const words = String(name || '').split(' ');
  const k = words.findIndex((w) => w !== w.toUpperCase());
  if (k <= 0) return String(name || '');
  return `${words.slice(0, k).join(' ')} ${words[k][0]}.`;
}
