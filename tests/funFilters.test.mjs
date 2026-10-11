import test from 'node:test';
import assert from 'node:assert/strict';
import { funRows, funCounts, redCards } from '../src/lib/funFilters.js';

const rows = [
  { key: 'a', tags: ['exact', 'wire'], scoreGap: 0 },
  { key: 'b', tags: ['near'], scoreGap: 2 },
  { key: 'c', tags: ['oops', 'near'], scoreGap: 2 },
  { key: 'd', tags: [], scoreGap: 14 },
  { key: 'e', tags: [], scoreGap: 9 },
  { key: 'f', tags: [], scoreGap: null },
  { key: 'g' },
];

test('fun filters pick rows by tag', () => {
  assert.deepEqual(
    funRows(rows, 'near').map((r) => r.key),
    ['b', 'c'],
  );
  assert.deepEqual(funCounts(rows), { exact: 1, near: 2, oops: 1, poker: 0, wire: 1, red: 2 });
});

test('red cards list the biggest gaps first, ties included', () => {
  assert.deepEqual(
    funRows(rows, 'red').map((r) => r.key),
    ['d', 'e'],
  );
  const many = [10, 9, 8, 8, 8, 7, 6].map((scoreGap, i) => ({ key: i, scoreGap }));
  assert.deepEqual(
    redCards(many, 3).map((r) => r.scoreGap),
    [10, 9, 8, 8, 8],
  );
});
