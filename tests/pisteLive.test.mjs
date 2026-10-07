import test from 'node:test';
import assert from 'node:assert/strict';
import { officialLink, pisteMatches, pistePrediction, pisteStatus } from '../src/lib/pisteLive.js';
test('official links reject scripts and lookalike hosts', () => {
  assert.equal(officialLink('javascript:alert(1)'), null);
  assert.equal(officialLink('https://www.fencingtimelive.com.evil.test/a'), null);
  assert.equal(officialLink('https://www.fencingtimelive.com/events/a'), 'https://www.fencingtimelive.com/events/a');
});
test('points are server awards including bonus, never inferred from a score', () => {
  const m = { isFinished: false, score1: 15, score2: 8, predictions: [{ userId: 7, pointsEarned: 4, bonusPoints: 1 }] };
  assert.equal(pistePrediction(m, 7).points, null);
  assert.equal(pistePrediction({ ...m, isFinished: true }, 7).points, 5);
  assert.equal(pistePrediction({ ...m, isFinished: true, pointsPending: true }, 7).points, null);
  assert.equal(pistePrediction({ ...m, isFinished: true, syncIssue: true }, 7).points, null);
  assert.equal(pistePrediction({ ...m, isFinished: true }, 8).points, null);
});
test('filters retain every matching official slot and exclude cancellations', () => {
  const ms = [
    { id: 1, round: 'T4', strip: '3', predictions: [{ userId: 7 }] },
    { id: 2, round: 'T4', strip: '3' },
    { id: 3, round: 'T2', strip: '4' },
    { id: 4, round: 'T4', strip: '3', resultType: 'CANCELLED' },
  ];
  assert.deepEqual(
    pisteMatches(ms, { round: 'T4', strip: '3' }).map((m) => m.id),
    [1, 2],
  );
  assert.deepEqual(
    pisteMatches(ms, { mine: true, userId: 7 }).map((m) => m.id),
    [1],
  );
});
test('closed does not falsely mean an assaut is live', () => {
  assert.equal(pisteStatus({ isClosed: true }), 'Résultat attendu');
  assert.equal(pisteStatus({ isFinished: true }), 'Résultat publié');
  assert.equal(pisteStatus({ isFinished: true, pointsPending: true }), 'Vérification en cours');
});
