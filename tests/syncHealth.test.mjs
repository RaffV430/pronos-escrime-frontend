import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextControlText, resumeText } from '../src/lib/syncHealth.js';
test('prochain contrôle : imminent sans faux retard, seuil de retard décidé par le serveur', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  const c = (ms, late = false) => ({ nextAutomaticAt: new Date(now + ms).toISOString(), late });
  assert.equal(nextControlText(c(10000), now), 'Contrôle imminent');
  assert.equal(nextControlText(c(-5000), now), 'Contrôle imminent');
  assert.equal(nextControlText(c(-600001, true), now), 'En retard');
  assert.equal(nextControlText(c(61000), now), 'dans 2 min');
  assert.equal(nextControlText({}, now), '—');
});
test('reprise J2 : horaire de Tokyo et conversion Paris', () => {
  const text = resumeText({ startsAt: '2026-10-17T01:40:00Z', timezone: 'Asia/Tokyo' });
  assert.match(text, /En attente de reprise J2/);
  assert.match(text, /03:40.*Paris/);
  assert.match(text, /10:40.*Tokyo/);
});
