import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countryName,
  flag,
  dateRange,
  seasonsOf,
  countriesOf,
  filterResults,
  resultText,
  playedMatches,
  roundName,
  cityName,
  shortName,
  shortRoundName,
  poolStanding,
  poolRounds,
} from '../src/components/eventResults.js';

const list = [
  {
    id: 1,
    name: 'Challenge Antony',
    start: '2026-10-04',
    season: 2026,
    city: 'Antony',
    countries: ['FR'],
    competitions: [{ name: 'Fleuret Dames', podium: [{ place: 1, name: 'DUPONT Anna' }] }],
  },
  {
    id: 2,
    name: 'Coupe du monde',
    start: '2026-03-12',
    season: 2025,
    city: 'Budapest',
    countries: ['HU'],
    competitions: [{ name: 'Fleuret Hommes', podium: [{ place: 1, name: 'KOVÁCS Péter' }] }],
  },
  {
    id: 3,
    name: 'Marathon',
    start: '2026-01-31',
    season: 2025,
    city: 'Paris',
    countries: ['FR'],
    competitions: [{ name: 'Cadettes', podium: [] }],
  },
];

test('pays en français et drapeau', () => {
  assert.equal(countryName('FR'), 'France');
  assert.equal(countryName('HU'), 'Hongrie');
  assert.equal(countryName(null), '');
  assert.equal(flag('FR'), '🇫🇷');
  assert.equal(flag('FRA'), '');
});

test('dates d’un tournoi sur un ou plusieurs jours', () => {
  assert.equal(dateRange('2026-10-04'), '4 octobre 2026');
  assert.equal(dateRange('2026-10-03', '2026-10-04'), '3–4 octobre 2026');
  assert.equal(dateRange('2026-01-31', '2026-02-01'), '31 janvier – 1 février 2026');
});

test('saisons, pays proposés, filtres et tri par date', () => {
  assert.deepEqual(seasonsOf(list), [2026, 2025]);
  assert.deepEqual(countriesOf(list), ['FR', 'HU']);
  assert.deepEqual(
    filterResults(list).map((t) => t.id),
    [1, 2, 3],
  );
  assert.deepEqual(
    filterResults(list, { order: 'asc' }).map((t) => t.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    filterResults(list, { season: '2025' }).map((t) => t.id),
    [2, 3],
  );
  assert.deepEqual(
    filterResults(list, { country: 'FR' }).map((t) => t.id),
    [1, 3],
  );
  // Recherche sans accents, y compris parmi les médaillés.
  assert.deepEqual(
    filterResults(list, { query: 'kovacs' }).map((t) => t.id),
    [2],
  );
});

test('score vainqueur en premier et matchs réellement disputés', () => {
  assert.equal(resultText({ score1: 8, score2: 15, winner: 2 }), '15–8');
  assert.equal(resultText({ score1: 15, score2: 13, winner: 1 }), '15–13');
  assert.equal(resultText({ resultType: 'MEDICAL_WITHDRAWAL', winner: 1 }), 'abandon');
  assert.deepEqual(
    playedMatches([
      { id: 1, isFinished: true },
      { id: 2, isFinished: false },
      { id: 3, isFinished: true, resultType: 'CANCELLED' },
      { id: 4, pointsPending: true },
    ]).map((m) => m.id),
    [1, 4],
  );
});

test('noms des tours et ville seule', () => {
  assert.deepEqual(['T256', 'T16', 'T8', 'T4', 'T2', 'Bronze'].map(roundName), [
    'Tableau de 256',
    'Tableau de 16',
    'Quarts de finale',
    'Demi-finales',
    'Finale',
    'Match pour la 3e place',
  ]);
  assert.equal(cityName('Veszprém, Veszprém megye, Hongrie'), 'Veszprém');
  assert.equal(cityName(null), '');
});

test('noms compacts, onglets de tours et classement des poules', () => {
  assert.equal(shortName('MONTI Lucrezia'), 'MONTI L.');
  assert.equal(shortName('DI VEROLI Gaia'), 'DI VEROLI G.');
  assert.equal(shortName('ITALY'), 'ITALY');
  assert.deepEqual(['T64', 'T8', 'T4', 'T2'].map(shortRoundName), ['T64', 'Quarts', 'Demies', 'Finale']);
  const fencers = [
    { name: 'A', position: 1, wins: 2, indicator: 1 },
    { name: 'B', position: 2, wins: 4, indicator: 9 },
    { name: 'C', position: 3, wins: 2, indicator: 5 },
  ];
  assert.deepEqual(
    poolStanding(fencers).map((f) => f.name),
    ['B', 'C', 'A'],
  );
  assert.deepEqual(
    poolRounds([{ name: 'Tour 2 · Poule 1' }, { name: 'Poule 10' }, { name: 'Poule 2' }]).map((r) => [
      r.round,
      r.pools.map((p) => p.name),
    ]),
    [
      [1, ['Poule 2', 'Poule 10']],
      [2, ['Tour 2 · Poule 1']],
    ],
  );
});

test('multi-day Engarde pool labels retain all rounds and pool IDs', () => {
  const pools = [
    { id: 11, name: 'Tour 1 · J1 · Poule 1' },
    { id: 21, name: 'Tour 2 · J1 · Poule 1' },
    { id: 31, name: 'Tour 3 · J1 · Poule 1' },
    { id: 41, name: 'Tour 4 · J2 · Poule 1' },
  ];
  assert.deepEqual(
    poolRounds(pools).map((r) => [r.round, r.pools.map((p) => p.id)]),
    [
      [1, [11]],
      [2, [21]],
      [3, [31]],
      [4, [41]],
    ],
  );
});

test('filtre par arme : épreuves de l’arme seulement, tournois sans cette arme écartés', async () => {
  const { filterResults, weaponOf, weaponsOf } = await import('../src/components/eventResults.js');
  assert.equal(weaponOf("Senior Men's Foil"), 'Fleuret');
  assert.equal(weaponOf('Épée Dames M17'), 'Épée');
  assert.equal(weaponOf('Senior Women’s Saber'), 'Sabre');
  assert.equal(weaponOf('Fleuret juniors dames par équipes'), 'Fleuret');
  assert.equal(weaponOf('Épreuve sans arme'), null);
  const list = [
    {
      id: 1,
      name: 'CISM',
      start: '2026-09-28',
      season: 2026,
      countries: ['HU'],
      competitions: [
        { id: 7, name: "Senior Men's Épée", podium: [] },
        { id: 9, name: "Senior Men's Foil", podium: [] },
        { id: 8, name: "Senior Women's Saber", podium: [] },
      ],
    },
    {
      id: 2,
      name: 'Rodez',
      start: '2026-10-17',
      season: 2026,
      countries: ['FR'],
      competitions: [{ id: 33, name: 'Épée Dames M17', podium: [] }],
    },
  ];
  assert.deepEqual(weaponsOf(list), ['Fleuret', 'Épée', 'Sabre']);
  const sabre = filterResults(list, { weapon: 'Sabre' });
  assert.deepEqual(
    sabre.map((t) => [t.id, t.competitions.map((c) => c.id)]),
    [[1, [8]]],
  );
  const epee = filterResults(list, { weapon: 'Épée', order: 'asc' });
  assert.deepEqual(
    epee.map((t) => [t.id, t.competitions.map((c) => c.id)]),
    [
      [1, [7]],
      [2, [33]],
    ],
  );
  assert.equal(filterResults(list, {}).find((t) => t.id === 1).competitions.length, 3);
});

test('filtre par catégorie, seul ou combiné à l’arme', async () => {
  const { filterResults, categoryOf, categoriesOf } = await import('../src/components/eventResults.js');
  const cases = {
    'Épée Dames M17': 'M17',
    'Cadet Men’s Foil': 'M17',
    'Fleuret cadettes dames — 24 septembre 2026': 'M17',
    'Junior Women’s Foil': 'M20',
    'Fleuret juniors hommes par équipes': 'M20',
    'Épée Hommes M20': 'M20',
    'Fleuret Dames senior': 'SENIOR',
    'Senior Team Men’s Foil': 'SENIOR',
    'Vet 40-59 Team Men’s Foil': 'VET',
    'Épée Hommes M23': 'M23',
    'Sabre M15 Dames': 'M15',
    'Épreuve nationale': null,
  };
  for (const [name, cat] of Object.entries(cases)) assert.equal(categoryOf(name), cat, name);
  const list = [
    {
      id: 1,
      name: 'Rodez',
      start: '2026-10-17',
      season: 2026,
      countries: ['FR'],
      competitions: [
        { id: 27, name: 'Épée Dames senior', podium: [] },
        { id: 33, name: 'Épée Dames M17', podium: [] },
        { id: 31, name: 'Épée Dames M20', podium: [] },
      ],
    },
    {
      id: 2,
      name: 'Étampes',
      start: '2026-10-10',
      season: 2026,
      countries: ['FR'],
      competitions: [
        { id: 14, name: 'Cadet Men’s Foil', podium: [] },
        { id: 15, name: 'Junior Men’s Foil', podium: [] },
      ],
    },
  ];
  assert.deepEqual(
    categoriesOf(list).map(([id]) => id),
    ['SENIOR', 'M20', 'M17'],
  );
  const cadets = filterResults(list, { category: 'M17', order: 'asc' });
  assert.deepEqual(
    cadets.map((t) => [t.id, t.competitions.map((c) => c.id)]),
    [
      [2, [14]],
      [1, [33]],
    ],
  );
  const fleuretCadets = filterResults(list, { category: 'M17', weapon: 'Fleuret' });
  assert.deepEqual(
    fleuretCadets.map((t) => [t.id, t.competitions.map((c) => c.id)]),
    [[2, [14]]],
  );
  assert.deepEqual(filterResults(list, { category: 'VET' }), []);
});
