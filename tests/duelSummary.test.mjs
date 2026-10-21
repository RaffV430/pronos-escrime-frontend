import test from 'node:test';
import assert from 'node:assert/strict';
import {
  byCategory,
  decisiveEvents,
  inRound,
  roundOptionLabel,
  roundOptions,
  visibleRows,
} from '../src/lib/duelSummary.js';

const row = (kind, competitionId, me, them, round = null) => ({
  kind,
  competitionId,
  competition: `Épreuve ${competitionId}`,
  round,
  me: me === null ? null : { points: me },
  them: them === null ? null : { points: them },
});
const rows = [
  row('match', 1, 1, null, 'T32'),
  row('match', 1, 0, 0, 'T32'),
  row('match', 2, 3, 0, 'T64'),
  row('pool', 2, 3, 5),
  row('podium', 1, 60, 35),
];

test('duel : écart par catégorie et épreuves décisives', () => {
  assert.deepEqual(
    byCategory(rows).map((c) => [c.label, c.me, c.them, c.gap]),
    [
      ['Poules', 3, 5, -2],
      ['Matchs', 4, 0, 4],
      ['Podiums', 60, 35, 25],
    ],
  );
  assert.deepEqual(
    decisiveEvents(rows).map((e) => [e.name, e.gap]),
    [
      ['Épreuve 1', 26],
      ['Épreuve 2', 1],
    ],
  );
});

test('duel : écarts triés, égalités masquées, filtres', () => {
  assert.deepEqual(
    visibleRows(rows).map((r) => r.kind + (r.me?.points ?? '')),
    ['podium60', 'match3', 'pool3', 'match1'],
  );
  assert.equal(visibleRows(rows, 'won').length, 3);
  assert.equal(visibleRows(rows, 'lost').length, 1);
  assert.equal(visibleRows(rows, 'all').length, 5);
});

test('classement par tour : options et filtre des lignes du duel', () => {
  const matches = [{ round: 'T32' }, { round: 'T64' }, { round: 'J1:T64' }, { round: 'T2' }, { round: 'T64' }];
  assert.deepEqual(roundOptions(matches, true), ['pools', 'J1:T64', 'T64', 'T32', 'T2', 'podium']);
  assert.deepEqual(roundOptions([], false), ['podium']);
  assert.equal(roundOptionLabel('J1:T64'), 'J1 · Tableau de 64');
  assert.equal(roundOptionLabel('T2'), 'Finale');
  assert.equal(inRound(rows, 'T32').length, 2);
  assert.equal(inRound(rows, 'pools').length, 1);
  assert.equal(inRound(rows, 'podium').length, 1);
  assert.equal(inRound(rows, '').length, 5);
});
