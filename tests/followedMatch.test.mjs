import test from 'node:test';
import assert from 'node:assert/strict';
import { followedMatchTarget } from '../src/lib/followedMatch.js';
const event = { id: 9 };
const entry = (id, extra = {}) => ({ event, match: { id, closesAt: '2026-10-10T10:00:00Z', ...extra } });
const now = Date.parse('2026-10-08T10:00:00Z');
test('favori : le match ouvert sans pronostic est prioritaire, quelle que soit l’épreuve', () => {
  const target = followedMatchTarget([entry(1, { predictions: [{ userId: 2 }] }), { ...entry(2), event: { id: 10 } }], 2, now);
  assert.equal(target.mode, 'predictions');
  assert.equal(target.match.id, 2);
  assert.equal(target.event.id, 10);
});
test('favori : verrouillage, résultat publié et identité du prochain tour respectés', () => {
  assert.equal(followedMatchTarget([entry(1, { isLocked: true })], 2, now).mode, 'follow');
  assert.equal(followedMatchTarget([entry(1, { isFinished: true })], 2, now).mode, 'follow');
  assert.equal(followedMatchTarget([entry(1, { awaitingPreviousRound: true })], 2, now).mode, 'follow');
  assert.equal(followedMatchTarget([entry(1, { resultType: 'CANCELLED' })], 2, now), null);
  assert.equal(followedMatchTarget([], 2, now), null);
});

test('favori : aucun accès aux matchs des tournois archivés', () => {
  const archived = { id: 4, archivedAt: '2026-10-01T10:00:00Z' };
  const oldOpen = { ...entry(3), tournament: archived };
  const oldFinished = { ...entry(4, { isFinished: true }), tournament: archived };
  assert.equal(followedMatchTarget([oldOpen, oldFinished], 2, now), null);
  const active = { ...entry(5), tournament: { id: 6, archivedAt: null } };
  assert.equal(followedMatchTarget([oldOpen, oldFinished, active], 2, now).match.id, 5);
});
