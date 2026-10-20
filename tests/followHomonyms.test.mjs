import test from 'node:test';
import assert from 'node:assert/strict';
import { followedClub, followedMatches, isFollowedFencer } from '../src/lib/fencerFollows.js';

// Journées de l'épée 2026 : deux « ROBERT Julien » ; seul celui de Perpignan est suivi.
const follows = {
  ready: true,
  matchNames: [],
  clubNames: [{ name: 'ROBERT Julien', club: 'PERPIGNAN RO' }],
};
const entry = { name: 'ROBERT Julien', country: 'PERPIGNAN RO' };
const m = (id, club1) => ({ id, player1: 'ROBERT Julien', club1, player2: 'X', club2: 'Y' });

test('étoile : homonyme suivi reconnu au nom et au club, jamais au nom seul', () => {
  assert.equal(isFollowedFencer(follows, 'ROBERT Julien', 'PERPIGNAN RO'), true);
  assert.equal(isFollowedFencer(follows, 'ROBERT Julien', 'DECINES TE'), false);
  assert.equal(isFollowedFencer(follows, 'ROBERT Julien'), false);
  assert.equal(isFollowedFencer({ ready: true, matchNames: ['BRES Nicolas'] }, 'BRES Nicolas'), true);
});

test('Mes tireurs : seulement les matchs du tireur suivi', () => {
  assert.equal(followedClub(follows, entry), 'PERPIGNAN RO');
  assert.deepEqual(
    followedMatches(follows, entry, [m(1, 'DECINES TE'), m(2, 'PERPIGNAN RO'), m(3, null)]).map((x) => x.id),
    [2],
  );
  assert.deepEqual(followedMatches({ ready: true, matchNames: [] }, entry, [m(2, 'PERPIGNAN RO')]), []);
});
