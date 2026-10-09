import test from 'node:test';
import assert from 'node:assert/strict';
import { isFollowedFencer } from '../src/lib/fencerFollows.js';

test('étoiles et filtre : uniquement les favoris rapprochés dans l’épreuve courante', () => {
  const current = { ready: true, matchNames: ['MARTIN Léa'], favorites: [{ name: 'DUPONT Marie' }] };
  assert.equal(isFollowedFencer(current, 'MARTIN Léa'), true);
  assert.equal(isFollowedFencer(current, 'DUPONT Marie'), false);
  assert.equal(isFollowedFencer(current, 'MARTIN Lea'), false);
  assert.equal(isFollowedFencer({ ...current, ready: false }, 'MARTIN Léa'), false);
  assert.equal(isFollowedFencer({ ready: true, matchNames: [] }, 'MARTIN Léa'), false);
  assert.equal(isFollowedFencer(null, 'MARTIN Léa'), false);
});
