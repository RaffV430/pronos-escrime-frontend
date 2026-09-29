import test from 'node:test';
import assert from 'node:assert/strict';
import { countdownText, countdownLabel } from '../src/lib/countdown.js';
import { withCount } from '../src/lib/plural.js';

test('countdown shows hours beyond 60 minutes instead of « 125:30 »', () => {
  assert.equal(countdownText(125 * 60 + 30), '2 h 05');
  assert.equal(countdownText(59 * 60 + 9), '59:09');
  assert.equal(countdownText(3600), '1 h 00');
  assert.equal(countdownLabel(7500), '2 heures 5 minutes');
  assert.equal(countdownLabel(61), '1 minute 1 secondes');
});

test('counts agree in number instead of « (s) »', () => {
  assert.equal(withCount(1, 'poule'), '1 poule');
  assert.equal(withCount(3, 'poule'), '3 poules');
  assert.equal(withCount(0, 'nouvelle rencontre', 'nouvelles rencontres'), '0 nouvelle rencontre');
  assert.equal(withCount(2, 'nouvelle rencontre', 'nouvelles rencontres'), '2 nouvelles rencontres');
});
