import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ftlPresentation } from '../src/lib/pisteLive.js';
test('FTL inversé : noms, scores, lampes et touches changent de côté sans muter les données', () => {
  const match = { id: 7, player1: 'A', player2: 'B', player1Country: 'FRA', player2Country: 'ITA' };
  const live = { ftlLeftPlayer: 2, score1: 3, score2: 5, fencer1: { lamp: true }, fencer2: {},
    history: [{ by: 1, score1: 3, score2: 5 }, { by: 'double', score1: 4, score2: 6 }] };
  const shown = ftlPresentation(match, live);
  assert.equal(shown.match.id, 7);
  assert.deepEqual([shown.match.player1, shown.match.player1Country, shown.live.score1], ['B', 'ITA', 5]);
  assert.equal(shown.live.fencer2.lamp, true);
  assert.deepEqual(shown.live.history.map(t => [t.by,t.score1,t.score2]), [[2,5,3],['double',6,4]]);
  assert.equal(match.player1, 'A');
  assert.equal(live.score1, 3);
});
test('sans orientation officielle ou après la fin, garder la présentation historique', () => {
  const match = { id: 1 };
  for (const live of [undefined, { ftlLeftPlayer: 1 }, { ftlLeftPlayer: 2, finished: true }]) {
    assert.equal(ftlPresentation(match, live).match, match);
    assert.equal(ftlPresentation(match, live).live, live);
  }
});
