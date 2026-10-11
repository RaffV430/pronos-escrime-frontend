import test from 'node:test';
import assert from 'node:assert/strict';
import { nextResultCheck, resultRevision } from '../src/lib/resultSync.js';
test('checks align with the next server check and remain bounded during errors', () => {
  assert.equal(nextResultCheck({ nextAt: new Date(11000).toISOString() }, 10000, false), 5000);
  assert.equal(nextResultCheck({ state: 'RUNNING' }, 0, false), 5000);
  assert.equal(nextResultCheck({ nextAt: 'bad' }, 0, false), 5000);
  assert.equal(nextResultCheck({ state: 'RUNNING' }, 0, true), 60000);
  assert.equal(resultRevision({ state: 'RUNNING', checkedAt: 'old' }), 'old');
});

test('normal and reduced result caches use the same interval as their screen checks', async () => {
 const {cacheLifetime}=await import('../src/lib/fieldCache.js');
 for(const reduced of [false,true]) for(const path of ['/matches?competitionId=14','/pools?competitionId=14','/podium/competitions/4']) {
   assert.equal(cacheLifetime(path,reduced),nextResultCheck({},0,reduced));
 }
});
