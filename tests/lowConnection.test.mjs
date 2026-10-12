import test from 'node:test';
import assert from 'node:assert/strict';
import { createDetector, networkHint } from '../src/lib/connectionQuality.js';
import { reducedInterval } from '../src/lib/resultSync.js';

test('slow answers or repeated cuts turn the low connection mode on, then off once it is fast again', () => {
  let t = 0;
  const d = createDetector(() => t);
  for (const ms of [400, 3500, 4200]) d.record(ms);
  assert.equal(d.active(), false);
  d.record(5000); // 4 dernières : médiane ≥ 3 s
  assert.equal(d.active(), true);
  // Réponses rapides mais trop tôt : on garde le mode au moins 5 minutes (pas de clignotement).
  for (let i = 0; i < 6; i++) d.record(300);
  assert.equal(d.active(), true);
  t += 6 * 60000;
  d.record(300);
  assert.equal(d.active(), false);
  // Deux coupures rapprochées suffisent.
  d.fail();
  assert.equal(d.active(), false);
  t += 30000;
  d.fail();
  assert.equal(d.active(), true);
});

test('phone network hints and polling pace', () => {
  assert.equal(networkHint({ effectiveType: '2g' }), true);
  assert.equal(networkHint({ saveData: true, effectiveType: '4g' }), true);
  assert.equal(networkHint({ effectiveType: '4g', downlink: 10, rtt: 50 }), false);
  assert.equal(networkHint(null), false);
  // Résultats : 30 s → 1 min ; le reste (1 min et plus) : trois fois moins souvent.
  assert.equal(reducedInterval(30000), 60000);
  assert.equal(reducedInterval(60000), 180000);
});
