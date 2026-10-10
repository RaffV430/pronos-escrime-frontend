import test from 'node:test';
import assert from 'node:assert/strict';
import { fencerProgress } from '../src/lib/fencerProgress.js';
const loss = { id: 3, round: 'T32', player1: 'A', player2: 'B', winner: 2, isFinished: true };
const appearance = { entryId: 'a', event: {}, matches: [loss] };
test('official loser is finished without inventing a ranking', () => {
  assert.equal(fencerProgress(appearance, 'A').eliminated, true);
  assert.equal(fencerProgress(appearance, 'A').rank, null);
  assert.equal(fencerProgress(appearance, 'B').finished, false);
});
test('next published round takes priority over an earlier loss or stale score', () => {
  const next = { ...loss, id: 4, round: 'T16', winner: null, isFinished: false };
  assert.equal(fencerProgress({ ...appearance, matches: [loss, next] }, 'A').finished, false);
  assert.equal(fencerProgress({ ...appearance, matches: [{ ...loss, syncIssue: 'conflict' }] }, 'A').finished, false);
});
test('winner of final finishes too, and rank requires a verified official classification', () => {
  const final = { ...loss, round: 'T2' };
  assert.equal(fencerProgress({ ...appearance, matches: [final] }, 'B').finished, true);
  assert.equal(
    fencerProgress({ ...appearance, event: { officialPodium: { classification: [{ entryId: 'a', rank: 18 }] } } }, 'A')
      .rank,
    null,
  );
  const ranked = {
    ...appearance,
    event: {
      resultsVerifiedAt: '2026-10-11',
      officialPodium: { finalConfirmed: true, classification: [{ entryId: 'a', rank: 18, tied: true }] },
    },
  };
  assert.equal(fencerProgress(ranked, 'A').rank, 18);
});
