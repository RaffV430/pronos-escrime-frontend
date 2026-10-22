import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSeenMatches, rememberSeenMatches, unseenMatchCount } from '../src/lib/seenMatches.js';
const store = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
};
test('visite, nouveaux matchs puis retour : le badge est acquitté après consultation', () => {
  const s = store(),
    u = 701,
    e = { id: 41, matches: [{ id: 1 }, { id: 2 }] };
  rememberSeenMatches(u, 41, [{ id: 1 }], s);
  assert.equal(unseenMatchCount(e, u, 42, s), 1);
  rememberSeenMatches(u, 41, e.matches, s);
  assert.equal(unseenMatchCount(e, u, 42, s), 0);
  assert.equal(unseenMatchCount({ ...e, matches: [...e.matches, { id: 3 }] }, u, 42, s), 1);
});
test('épreuve courante : aucun badge périmé ; autres épreuves inchangées', () => {
  const s = store(),
    u = 702;
  rememberSeenMatches(u, 41, [], s);
  rememberSeenMatches(u, 42, [], s);
  assert.equal(unseenMatchCount({ id: 41, matches: [{ id: 1 }] }, u, 41, s), 0);
  assert.equal(unseenMatchCount({ id: 42, matches: [{ id: 2 }] }, u, 41, s), 1);
});
test('réponses partielles ou hors ligne ne font pas réapparaître les matchs déjà vus', () => {
  const s = store(),
    u = 703;
  rememberSeenMatches(u, 41, [{ id: 1 }, { id: 2 }], s);
  rememberSeenMatches(u, 41, [{ id: 1 }], s);
  assert.deepEqual(readSeenMatches(u, 41, s), [1, 2]);
  assert.equal(unseenMatchCount({ id: 41, matches: [{ id: 1 }, { id: 2 }] }, u, 42, s), 0);
});
test('état isolé par compte et épreuve ; pronostic déjà présent exclu', () => {
  const s = store();
  rememberSeenMatches(704, 41, [], s);
  rememberSeenMatches(705, 41, [{ id: 1 }], s);
  const event = { id: 41, matches: [{ id: 1, predictions: [{ userId: 704 }] }, { id: 2 }] };
  assert.equal(unseenMatchCount(event, 704, 42, s), 1);
  assert.equal(unseenMatchCount(event, 705, 42, s), 1);
  assert.equal(readSeenMatches(704, 42, s), null);
});
test('stockage bloqué ou corrompu : reste utilisable, sans toucher aux brouillons', () => {
  const bad = {
    getItem: () => {
      throw Error('blocked');
    },
    setItem: () => {
      throw Error('blocked');
    },
  };
  rememberSeenMatches(706, 41, [{ id: 1 }], bad);
  assert.equal(unseenMatchCount({ id: 41, matches: [{ id: 1 }] }, 706, 42, bad), 0);
  const writes = [];
  const corrupt = { getItem: () => '{broken', setItem: (k, v) => writes.push([k, v]) };
  rememberSeenMatches(707, 41, [{ id: 1 }], corrupt);
  assert.deepEqual(
    writes.map(([k]) => k),
    ['pronos:seen-matches:707:41'],
  );
});

test('consultation Direct ou Pronos : aucun acquittement prématuré ou réponse d’une autre épreuve', async () => {
  const { rememberLoadedMatches } = await import('../src/lib/seenMatches.js');
  const s = store();
  const state = { userId: 708, competitionId: 41, matches: [{ id: 1, competitionId: 41 }], ready: true };
  for (const extra of [
    { ready: false },
    { stale: true },
    { error: 'offline' },
    { visible: false },
    { competitionId: 42 },
  ])
    assert.equal(rememberLoadedMatches({ ...state, ...extra }, s), null);
  assert.equal(readSeenMatches(708, 41, s), null);
  rememberLoadedMatches(state, s);
  assert.deepEqual(readSeenMatches(708, 41, s), [1]);
});
