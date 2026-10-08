import test from 'node:test';
import assert from 'node:assert/strict';
import { validReadingPosition } from '../src/lib/readingPosition.js';
test('reading position is scoped to the same route and a recent reload', () => {
  const position = { route: '/pronostiquer/a/tableau?view=mine', x: 0, y: 1200, at: 1000 };
  assert.equal(validReadingPosition(position, position.route, 2000), true);
  assert.equal(validReadingPosition(position, '/accueil', 2000), false);
  assert.equal(validReadingPosition(position, position.route, 121000), false);
  assert.equal(validReadingPosition(position, position.route, 999), false);
  for (const y of [-1, NaN, Infinity, '1200']) assert.equal(validReadingPosition({ ...position, y }, position.route, 2000), false);
  assert.equal(validReadingPosition(null, position.route, 2000), false);
});
