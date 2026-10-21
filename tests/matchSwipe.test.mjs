import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeSide, swipeCandidates } from '../src/lib/matchSwipe.js';

test('swipe : direction, seuil, petit geste, défilement vertical et vitesse', () => {
  const gesture = { x: 110, y: 5, elapsed: 500, width: 390 };
  assert.equal(swipeSide(gesture), 2);
  assert.equal(swipeSide({ ...gesture, x: -110 }), 1);
  assert.equal(swipeSide({ ...gesture, x: 20 }), null);
  assert.equal(swipeSide({ ...gesture, y: 150 }), null);
  assert.equal(swipeSide({ ...gesture, x: 45, elapsed: 60 }), 2);
  assert.equal(swipeSide({ ...gesture, x: 45, elapsed: 500 }), null);
  assert.equal(swipeSide({ ...gesture, x: 76, width: 320 }), 2);
});
test('file rapide : ne remplace ni pronostic, ni brouillon, ni envoi différé ; ignore clôtures et exempts', () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, player1: 'A', player2: 'B' }));
  rows[4].player2 = 'En attente...';
  rows[5].player2 = 'BYE';
  rows[6].player1 = '';
  const before = structuredClone(rows);
  assert.deepEqual(
    swipeCandidates(rows, {
      closed: (m) => m.id === 1,
      hasPrediction: (m) => m.id === 2,
      hasDraft: (m) => [3, 4].includes(m.id),
    }).map((m) => m.id),
    [8],
  );
  assert.deepEqual(rows, before);
});
