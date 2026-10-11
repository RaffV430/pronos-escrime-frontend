import test from 'node:test';
import assert from 'node:assert/strict';
import { nextResultCheck, resultRevision, RESULT_REFRESH_MS } from '../src/lib/resultSync.js';

test('checks follow the server schedule, stay fast while a check runs and slow down when finished', () => {
  assert.equal(nextResultCheck({ nextAt: new Date(11000).toISOString() }, 10000, false), 5000);
  assert.equal(nextResultCheck({ nextAt: new Date(20000).toISOString() }, 10000, false), 11000);
  assert.equal(nextResultCheck({ nextAt: new Date(999999).toISOString() }, 0, false), 30000);
  assert.equal(nextResultCheck({ state: 'RUNNING' }, 0, false), 5000);
  assert.equal(nextResultCheck({ nextAt: 'bad' }, 0, false), 30000);
  assert.equal(nextResultCheck({ state: 'COMPLETE' }, 0, false), 120000);
  assert.equal(nextResultCheck({ state: 'RUNNING' }, 0, true), 60000);
  assert.equal(resultRevision({ state: 'RUNNING', checkedAt: 'old' }), 'old');
});

test('result caches last as long as the screen safety refresh', async () => {
  const { cacheLifetime } = await import('../src/lib/fieldCache.js');
  for (const path of ['/matches?competitionId=14', '/pools?competitionId=14', '/podium/competitions/4'])
    assert.equal(cacheLifetime(path, false), RESULT_REFRESH_MS);
});
