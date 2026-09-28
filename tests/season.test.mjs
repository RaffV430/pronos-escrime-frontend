import test from 'node:test';
import assert from 'node:assert/strict';
import { rowMatches, filterSeason, signedPoints } from '../src/components/seasonPresentation.js';

const row = (outcome, name = 'Dupont / Martin', prediction = '15 – 8') => ({ outcome, name, prediction });

test('filters group exact and partial points, and keep misses and pending apart', () => {
  assert.equal(rowMatches(row('exact'), 'scored'), true);
  assert.equal(rowMatches(row('points'), 'scored'), true);
  assert.equal(rowMatches(row('miss'), 'scored'), false);
  assert.equal(rowMatches(row('points'), 'exact'), false);
  assert.equal(rowMatches(row('pending'), 'pending'), true);
  assert.equal(rowMatches(row('cancelled'), 'all'), true);
});

test('search ignores accents and case, on names and predictions', () => {
  assert.equal(rowMatches(row('miss', 'Lefèvre / Noël'), 'all', 'lefevre'), true);
  assert.equal(rowMatches(row('miss', 'Poule 1 · Hélène', '3 V · indice 5'), 'all', 'HELENE'), true);
  assert.equal(rowMatches(row('miss'), 'all', 'inconnu'), false);
});

test('filtering removes empty competitions and tournaments', () => {
  const data = [
    {
      id: 1,
      competitions: [
        { id: 10, rows: [row('exact')] },
        { id: 11, rows: [row('miss')] },
      ],
    },
    { id: 2, competitions: [{ id: 20, rows: [row('pending')] }] },
  ];
  const out = filterSeason(data, 'exact', '');
  assert.deepEqual(
    out.map((t) => [t.id, t.competitions.map((c) => c.id)]),
    [[1, [10]]],
  );
  assert.deepEqual(filterSeason(undefined, 'all', ''), []);
  assert.equal(signedPoints(3), '+3');
  assert.equal(signedPoints(-1), '-1');
  assert.equal(signedPoints(0), '0');
});
