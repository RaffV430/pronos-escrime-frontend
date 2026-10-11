import test from 'node:test';
import assert from 'node:assert/strict';
import { nextResultCheck, resultRevision } from '../src/lib/resultSync.js';
test('checks align with the next server check and remain bounded during errors', () => {
  assert.equal(nextResultCheck({ nextAt: new Date(11000).toISOString() }, 10000, false), 5000);
  assert.equal(nextResultCheck({ state: 'RUNNING' }, 0, false), 5000);
  assert.equal(nextResultCheck({ nextAt: 'bad' }, 0, false), 30000);
  assert.equal(nextResultCheck({ state: 'RUNNING' }, 0, true), 60000);
  assert.equal(resultRevision({ state: 'RUNNING', checkedAt: 'old' }), 'old');
});
