import test from 'node:test';
import assert from 'node:assert/strict';
import { otherSections } from '../src/lib/nav2.js';

const ids = (tabs) => otherSections(tabs).map(([id]) => id);

test('Mon espace liste seulement les sections générales absentes de la barre', () => {
  assert.deepEqual(ids(['home', 'play', 'live', 'leaderboard', 'me']), []);
  assert.deepEqual(ids(['home', 'mine', 'community']), ['play', 'live', 'leaderboard']);
  assert.deepEqual(ids(['home', 'play', 'me', 'hub']), ['live', 'leaderboard']);
  assert.deepEqual(ids([]), ['play', 'live', 'leaderboard']);
});
