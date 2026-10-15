import test from 'node:test';
import assert from 'node:assert/strict';
import { livePistes, PISTE_FRESH_MS } from '../src/lib/livePistes.js';
const now = Date.parse('2026-10-15T06:00:00Z');
const score = { score1: 6, score2: 8, updatedAt: new Date(now).toISOString() };
test('seules les rencontres actives de la sélection avec un signal récent apparaissent', () => {
  const matches = [
    { id: 1 },
    { id: 2, isFinished: true },
    { id: 3, resultType: 'CANCELLED' },
    { id: 4 },
    { id: 5 },
    { id: 6 },
  ];
  const live = new Map([
    [1, score],
    [2, score],
    [3, score],
    [4, { ...score, finished: true }],
    [5, { ...score, updatedAt: 'invalid' }],
    [99, score],
  ]);
  assert.deepEqual(
    livePistes(matches, live, now).map((x) => x.match.id),
    [1],
  );
  assert.equal(livePistes(matches, live, now + PISTE_FRESH_MS).length, 1);
  assert.equal(livePistes(matches, live, now + PISTE_FRESH_MS + 1).length, 0);
});
test('les côtés FTL sont respectés sans toucher aux identifiants, pronostics ou phases', () => {
  const matches = [
    { id: 1, round: 'J1:T64', player1: 'Alpha', player2: 'Beta', predictions: [{ id: 7, score1: 12 }] },
    { id: 2, round: 'T64', player1: 'Gamma', player2: 'Delta' },
  ];
  const live = new Map([
    [1, { ...score, ftlLeftPlayer: 2, fencer1: { lamp: true }, fencer2: { white: true } }],
    [2, score],
  ]);
  const before = structuredClone(matches);
  const rows = livePistes(matches, live, now);
  assert.equal(rows[0].match.player1, 'Beta');
  assert.equal(rows[0].live.score1, 8);
  assert.deepEqual(rows[0].live.fencer1, { white: true });
  assert.deepEqual(rows[0].live.fencer2, { lamp: true });
  assert.deepEqual(live.get(1).fencer1, { lamp: true });
  assert.deepEqual(
    rows.map((x) => [x.match.id, x.match.round]),
    [
      [1, 'J1:T64'],
      [2, 'T64'],
    ],
  );
  assert.deepEqual(matches, before);
  assert.equal(live.get(1).score1, 6);
});
