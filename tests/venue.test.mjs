import test from 'node:test';
import assert from 'node:assert/strict';
import { parisTime, venueLabel, venueTime } from '../src/lib/venue.js';

test('venue label keeps city, region and country without repeats of empty parts', () => {
  assert.equal(venueLabel({ name: 'Budapest', region: null, country: 'Hongrie' }), 'Budapest, Hongrie');
  assert.equal(
    venueLabel({ name: 'Budapest', region: 'Georgia', country: 'États-Unis' }),
    'Budapest, Georgia, États-Unis',
  );
  assert.equal(venueLabel(null), '');
});

test('a 6:15 PM final in Budapest reads 18:15 on site and in Paris', () => {
  assert.equal(venueTime('2026-09-29T16:15:00.000Z', 'Europe/Budapest'), '18:15');
  assert.equal(parisTime('2026-09-29T16:15:00.000Z'), '18:15');
  // The wrong Istanbul zone shows the one-hour gap the preview now makes visible.
  assert.equal(parisTime('2026-09-29T15:15:00.000Z'), '17:15');
});

test('invalid inputs give no time rather than a wrong one', () => {
  assert.equal(parisTime(null), null);
  assert.equal(parisTime('nope'), null);
  assert.equal(venueTime('2026-09-29T16:15:00.000Z', 'Not/AZone'), null);
});
