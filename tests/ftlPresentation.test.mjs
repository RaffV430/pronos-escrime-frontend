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

test('FTL inversé : les pourcentages et le score populaire suivent les tireurs affichés', () => {
  const match = { id: 12, player1: 'A', player2: 'B',
    crowd: { total: 10, player1Pct: 10, player2Pct: 90,
      topScore: { score1: 13, score2: 15, count: 3 }, outsider: true },
    predictions: [{ userId: 7, predictedScore1: 13, predictedScore2: 15, pointsEarned: 4 }] };
  const before = structuredClone(match);
  const shown = ftlPresentation(match, { ftlLeftPlayer: 2 });
  assert.deepEqual([shown.match.player1, shown.match.crowd.player1Pct], ['B', 90]);
  assert.deepEqual([shown.match.player2, shown.match.crowd.player2Pct], ['A', 10]);
  assert.deepEqual(shown.match.crowd.topScore, { score1: 15, score2: 13, count: 3 });
  assert.equal(shown.match.crowd.total, 10);
  assert.equal(shown.match.crowd.outsider, true);
  assert.equal(shown.match.predictions, match.predictions);
  assert.deepEqual(match, before);
  for (const live of [undefined, { ftlLeftPlayer: 1 }, { ftlLeftPlayer: 2, finished: true }]) {
    assert.equal(ftlPresentation(match, live).match.crowd, match.crowd);
  }
});
test('FTL inversé : répartition sans score populaire et sans pronostic reste utilisable', () => {
  const shown = ftlPresentation({ crowd: { total: 1, player1Pct: 100, player2Pct: 0 } }, { ftlLeftPlayer: 2 });
  assert.equal(shown.match.crowd.player1Pct, 0);
  assert.equal(shown.match.crowd.player2Pct, 100);
  assert.equal(shown.match.crowd.topScore, undefined);
  assert.equal(ftlPresentation({}, { ftlLeftPlayer: 2 }).match.crowd, undefined);
});
