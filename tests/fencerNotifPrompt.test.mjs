import test from 'node:test';
import assert from 'node:assert/strict';
import { dismissPrompt, fencerAlertsOn, promptAllowed } from '../src/lib/fencerNotifPrompt.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test('invitation seulement si les deux options « Mes tireurs » ne sont pas déjà actives', () => {
  assert.equal(fencerAlertsOn({ fencerEntries: true, fencerResults: true }), true);
  assert.equal(fencerAlertsOn({ fencerEntries: true, fencerResults: false }), false);
  assert.equal(fencerAlertsOn(undefined), false);
});

test('« Plus tard » repousse l’invitation de 30 jours, pour ce joueur seulement', () => {
  const storage = memory();
  const now = Date.parse('2026-10-19T12:00:00Z');
  assert.equal(promptAllowed(4, now, storage), true);
  dismissPrompt(4, now, storage);
  assert.equal(promptAllowed(4, now + 86400000, storage), false);
  assert.equal(promptAllowed(5, now, storage), true);
  assert.equal(promptAllowed(4, now + 31 * 86400000, storage), true);
});
