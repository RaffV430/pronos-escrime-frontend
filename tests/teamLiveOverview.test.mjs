import test from 'node:test';
import assert from 'node:assert/strict';
import { teamLiveRows } from '../src/lib/teamLiveOverview.js';
const now = Date.now();
const rows = new Map([
  ['w', { matchId: 'w', gender: 'women', updatedAt: new Date(now).toISOString() }],
  ['m', { matchId: 'm', gender: 'men', updatedAt: new Date(now).toISOString() }],
]);
test('la sélection permet plusieurs matchs et les filtres hommes/femmes restent indépendants', () => {
  assert.equal(teamLiveRows(rows, { now }).length, 2);
  assert.deepEqual(
    teamLiveRows(rows, { now, gender: 'women' }).map((x) => x.matchId),
    ['w'],
  );
  assert.deepEqual(
    teamLiveRows(rows, { now, selected: new Set(['w', 'm']) }).map((x) => x.matchId),
    ['w', 'm'],
  );
  assert.deepEqual(teamLiveRows(rows, { now, selected: new Set() }), []);
  assert.deepEqual(teamLiveRows(rows, { now, selected: new Set(['w']), gender: 'men' }), []);
});
test('une nouvelle rencontre sur la même piste ne remplace pas un match choisi et les signaux périmés disparaissent', () => {
  const changed = new Map(rows);
  changed.delete('w');
  changed.set('new', { ...rows.get('w'), matchId: 'new' });
  assert.deepEqual(teamLiveRows(changed, { now, selected: new Set(['w']) }), []);
  assert.deepEqual(teamLiveRows(rows, { now: now + 180001 }), []);
  assert.equal(rows.size, 2);
});
