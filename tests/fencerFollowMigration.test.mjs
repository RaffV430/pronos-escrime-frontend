import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remainingLocalFollows } from '../src/lib/fencerFollowMigration.js';
test('seuls les favoris confirmés par le serveur sont retirés de la copie locale', () => {
  const items = ['verified', 'unknown', 'outside-batch'];
  assert.deepEqual(remainingLocalFollows(items, 2, { imported: [17], unresolved: [1] }), ['unknown', 'outside-batch']);
});
test('une réponse absente ou invalide préserve tous les anciens favoris', () => {
  const items = ['a', 'b'];
  for (const result of [null, {}, { imported: [], unresolved: [-1] }, { imported: [], unresolved: [2] }])
    assert.equal(remainingLocalFollows(items, 2, result), items);
});
