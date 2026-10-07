import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreviewFollows } from '../src/lib/previewFollows.js';
const stored = (value) => ({ getItem: () => value });
test('un stockage indisponible ou invalide ne bloque pas les fiches', () => {
  for (const value of ['broken', '{}', 'null']) assert.deepEqual(readPreviewFollows(stored(value), 'key'), []);
  assert.deepEqual(
    readPreviewFollows(
      {
        getItem() {
          throw new Error('denied');
        },
      },
      'key',
    ),
    [],
  );
});
test('préserve les identifiants de deux homonymes et élimine les doublons', () => {
  const a = { id: 'a', name: 'MARTIN Léa' },
    b = { id: 'b', name: 'MARTIN Léa' };
  assert.deepEqual(readPreviewFollows(stored(JSON.stringify([a, b, a, null, { id: 'x' }])), 'key'), [a, b]);
});
