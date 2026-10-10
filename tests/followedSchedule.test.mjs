import test from 'node:test';
import assert from 'node:assert/strict';
import { followedPool, followedSchedule } from '../src/lib/followedSchedule.js';
const name = 'DIARRA Hayden';
const pool = { name: 'Poule 4', startsAt: '2026-10-10T06:30:00Z', strip: '4', fencers: [{ name }] };
test('horaires de poule disponibles avant publication du tableau', () => {
  assert.equal(followedPool([pool], name, [name]), pool);
  const schedule = followedSchedule(null, pool);
  assert.equal(schedule.time, new Date(pool.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  assert.equal(schedule.strip, 'Piste 4');
  assert.equal(schedule.poolName, 'Poule 4');
});
test('identité non validée et homonymes : aucun horaire arbitraire', () => {
  assert.equal(followedPool([pool], name), null);
  assert.equal(followedPool([pool, { ...pool, name: 'Poule 5' }], name, [name]), null);
  assert.equal(followedPool([{ ...pool, fencers: [{ name }, { name }] }], name, [name]), null);
});
test('le nouveau tour de poules remplace le premier', () => {
  const second = { ...pool, name: 'Tour 2 · Poule 1', strip: '7' };
  assert.equal(followedPool([pool, second], name, [name]), second);
});
test('un match du tableau publié prend le relais sans mélanger sa piste avec la poule', () => {
  const match = { startsAt: '2026-10-10T10:00:00Z', strip: '12' };
  assert.equal(followedSchedule(match, pool).strip, 'Piste 12');
  assert.equal(followedSchedule(match, pool).poolName, null);
  assert.equal(followedSchedule({ startsAt: match.startsAt }, pool).strip, 'Piste à confirmer');
  assert.equal(followedSchedule({ ...match, isFinished: true }, pool).strip, 'Piste 12');
});
test('un résultat du tableau conserve son horaire et sa piste au lieu de revenir à la poule', () => {
  const match = { startsAt: '2026-10-10T12:10:00Z', strip: '25', isFinished: true };
  assert.equal(followedSchedule(match, pool).poolName, null);
  assert.equal(followedSchedule(match, pool).strip, 'Piste 25');
  assert.equal(followedSchedule(match, pool).time, new Date(match.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  assert.equal(followedSchedule({ ...match, startsAt: null, strip: null }, pool).strip, 'Piste à confirmer');
});
test('une nouvelle poule postérieure au tableau terminé peut prendre le relais', () => {
  const match = { startsAt: '2026-10-10T10:00:00Z', strip: '12', isFinished: true };
  const nextPool = { ...pool, name: 'Tour 2 · Poule 1', startsAt: '2026-10-10T13:00:00Z' };
  assert.equal(followedSchedule(match, nextPool).poolName, nextPool.name);
  assert.equal(followedSchedule({ ...match, isFinished: false }, nextPool).poolName, null);
});
test('données absentes ou invalides restent explicitement inconnues', () => {
  assert.deepEqual(followedSchedule(null, null), { time: 'Horaire à confirmer', strip: 'Piste à confirmer', poolName: undefined });
  assert.equal(followedSchedule(null, { startsAt: 'invalid' }).time, 'Horaire à confirmer');
});
