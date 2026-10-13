import test from 'node:test';
import assert from 'node:assert/strict';
import { groupSearchResults } from '../src/lib/searchResults.js';
test('names are grouped without merging distinct fencer identities or favorites', () => {
  const a = { kind: 'fencer', key: 'profile:1', name: 'ALPHA Test', athlete: { favoriteId: 5 } };
  const b = { kind: 'fencer', key: 'entry:2', name: 'ALPHA Test', athlete: { favoriteId: null } };
  const c = { kind: 'player', key: 'player:3', name: 'ALPHA Test' };
  const groups = groupSearchResults([a, b, c, a]);
  assert.deepEqual(groups, [[a, b], [c]]);
  assert.equal(groups[0][0].athlete.favoriteId, 5);
  assert.equal(groups[0][1].athlete.favoriteId, null);
});
