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
