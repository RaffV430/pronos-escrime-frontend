import test from 'node:test';
import assert from 'node:assert/strict';
import { prioritizeFencerGroups } from '../src/lib/fencerGroups.js';
const group = (key, startsAt) => ({ key, appearance: { event: { startsAt } }, cards: [] });
const now = Date.parse('2026-10-09T10:00:00Z');
const next = group('next', '2026-10-10T09:00:00Z');
const later = group('later', '2026-10-11T09:00:00Z');
const unknown = group('unknown', null);
test('sans live, la prochaine épreuve est dépliée et les autres restent secondaires', () => {
  const result = prioritizeFencerGroups([later, unknown, next], now);
  assert.deepEqual(result.featured, [next]);
  assert.deepEqual(result.upcoming, [later]);
  assert.deepEqual(result.unknown, [unknown]);
  assert.equal(result.live, false);
});
test('au début de l’épreuve, le live prend automatiquement la priorité', () => {
  const result = prioritizeFencerGroups([later, unknown, next], Date.parse('2026-10-10T09:00:00Z'));
  assert.equal(result.live, true);
  assert.deepEqual(result.featured, [next]);
  assert.deepEqual(result.upcoming, [later]);
});
test('les horaires inconnus et la liste vide ne créent pas de faux live', () => {
  assert.deepEqual(prioritizeFencerGroups([], now).featured, []);
  assert.deepEqual(prioritizeFencerGroups([unknown], now).featured, []);
});

test('le live commence exactement 90 minutes avant le départ', () => {
  const start = Date.parse(next.appearance.event.startsAt);
  assert.equal(prioritizeFencerGroups([next], start - 90 * 60000 - 1).live, false);
  assert.equal(prioritizeFencerGroups([next], start - 90 * 60000).live, true);
});
