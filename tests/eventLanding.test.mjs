import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventLanding } from '../src/components/matchPresentation.js';
test('landing follows available phase and missing predictions', () => {
  assert.deepEqual(eventLanding([], 1), { tab: 'pools', filter: 'Tous' });
  assert.equal(eventLanding([], 1, 0, true).tab, 'tableau');
  const m = { id: 1, isFinished: false, predictions: [] };
  assert.equal(eventLanding([m], 1).filter, 'À compléter');
  assert.equal(eventLanding([{ ...m, predictions: [{ userId: 1 }] }], 1).filter, 'À venir');
  assert.equal(eventLanding([{ ...m, isFinished: true }], 1).filter, 'Résultats publiés');
  assert.equal(eventLanding([{ ...m, isLocked: true }], 1).filter, 'Tous');
  assert.equal(eventLanding([{ ...m, resultType: 'CANCELLED' }], 1).tab, 'pools');
});
