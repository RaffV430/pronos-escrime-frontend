import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poolEarnedPoints } from '../src/lib/poolEarnedPoints.js';
const pool = (points) => ({ isFinal: true, fencers: points.map((pointsEarned) => ({ prediction: { pointsEarned } })) });
test('total de poule publié : somme des points enregistrés', () => {
  const p = pool([1, 0, 6, 0, 3, 3, 6]);
  const before = structuredClone(p);
  assert.equal(poolEarnedPoints(p), 19);
  assert.deepEqual(p, before);
});
test('multiplicateur déjà appliqué côté serveur : aucun doublement supplémentaire', () => {
  assert.equal(poolEarnedPoints({ ...pool([12, 4]), pointsMultiplier: 2 }), 16);
});
test('sans pronostic et zéro point : afficher un vrai zéro', () => {
  assert.equal(poolEarnedPoints({ isFinal: true, fencers: [{ prediction: null }] }), 0);
  assert.equal(poolEarnedPoints(pool([0])), 0);
});
test('résultat absent ou points indisponibles : pas de total inventé', () => {
  assert.equal(poolEarnedPoints({ ...pool([8]), isFinal: false }), null);
  assert.equal(poolEarnedPoints({ isFinal: true }), null);
  assert.equal(poolEarnedPoints(pool([undefined])), null);
});
test('tireur retiré : conserver les points persistés sans nouvelle règle côté affichage', () => {
  const p = pool([6, 0]);
  p.fencers[1].status = 'MEDICAL';
  assert.equal(poolEarnedPoints(p), 6);
});
