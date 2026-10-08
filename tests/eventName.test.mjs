import test from 'node:test';
import assert from 'node:assert/strict';
import { eventNameFr } from '../src/lib/eventName.js';
test('English event names displayed in French without changing unknown names', () => {
  assert.equal(eventNameFr("Cadet Women's Foil"), 'Fleuret · Cadettes · Dames');
  assert.equal(eventNameFr("Junior Men's Epee Team"), 'Épée · Juniors · Hommes · Par équipes');
  assert.equal(eventNameFr('Senior Women Saber'), 'Sabre · Seniors · Dames');
  assert.equal(eventNameFr('Fleuret cadettes · simulation'), 'Fleuret cadettes · simulation');
  assert.equal(eventNameFr('Challenge Étampes'), 'Challenge Étampes');
});
