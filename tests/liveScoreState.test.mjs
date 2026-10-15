import test from 'node:test';
import assert from 'node:assert/strict';
import { scoresForCompetition, hasActiveLiveScore } from '../src/lib/liveScoreState.js';
const match = { id: 10, competitionId: 2, isFinished: false };
test('header Live appears only for a detected running score in the selected event', () => {
  assert.equal(hasActiveLiveScore(new Map(), [match], 2), false);
  const live = new Map([[10, { matchId: 10, finished: false, score1: 0, score2: 0 }]]);
  assert.equal(hasActiveLiveScore(live, [match], 2), true);
  assert.equal(hasActiveLiveScore(live, [{ ...match, isFinished: true }], 2), false);
  assert.equal(hasActiveLiveScore(live, [match], 3), false);
  assert.equal(hasActiveLiveScore(live, [], 2), false);
  assert.equal(hasActiveLiveScore(new Map([[10, { matchId: 10, finished: true }]]), [match], 2), false);
});
test('switching events or disabling live never exposes the previous event scores', () => {
  const scores = new Map([[10, { matchId: 10, finished: false }]]);
  const snapshot = { competitionId: 2, scores };
  assert.equal(scoresForCompetition(snapshot, 2, true), scores);
  assert.equal(scoresForCompetition(snapshot, 3, true).size, 0);
  assert.equal(scoresForCompetition(snapshot, 2, false).size, 0);
});

import { applyLiveMessage } from '../src/lib/liveScoreState.js';
test('patches : scores, lampes, touches, correction, suppression et reconnexion', () => {
  const initial = { matchId: 1, score1: 1, score2: 0, fencer1: { light: 'red' }, history: [{ by: 1 }] };
  let scores = applyLiveMessage(new Map(), { version: 1, reset: true, matches: [initial], removed: [] });
  scores = applyLiveMessage(scores, {
    version: 1,
    reset: false,
    matches: [{ matchId: 1, score1: 2, fencer1: { light: 'white' }, historyFrom: 1, historyAppend: [{ by: 2 }] }],
    removed: [],
  });
  assert.equal(scores.get(1).score1, 2);
  assert.equal(scores.get(1).fencer1.light, 'white');
  assert.deepEqual(scores.get(1).history, [{ by: 1 }, { by: 2 }]);
  assert.deepEqual(initial.history, [{ by: 1 }]);
  assert.throws(() =>
    applyLiveMessage(scores, {
      version: 1,
      reset: false,
      matches: [{ matchId: 1, historyFrom: 0, historyAppend: [] }],
      removed: [],
    }),
  );
  scores = applyLiveMessage(scores, {
    version: 1,
    reset: false,
    matches: [{ matchId: 1, history: [], historyIssue: 'Correction' }],
    removed: [],
  });
  assert.equal(scores.get(1).history.length, 0);
  scores = applyLiveMessage(scores, { version: 1, reset: true, matches: [{ matchId: 2 }], removed: [] });
  assert.deepEqual([...scores.keys()], [2]);
  assert.equal(applyLiveMessage(scores, { version: 1, reset: false, matches: [], removed: [2] }).size, 0);
  assert.equal(applyLiveMessage(scores, [initial]).get(1).score1, 1);
});
