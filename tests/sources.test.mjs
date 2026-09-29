import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceOf } from '../src/lib/sources.js';

test('admin links are recognized by site', () => {
  assert.equal(sourceOf('https://engarde-service.com/tournament/life/elcantony2026'), 'engarde');
  assert.equal(sourceOf('https://www.engarde-service.com/competition/life/x/y/poules1.htm'), 'engarde');
  assert.equal(sourceOf('https://www.fencingtimelive.com/tournaments/eventSchedule/ABC'), 'ftl');
  assert.equal(sourceOf('https://engarde-service.com/'), null);
  assert.equal(sourceOf('pas un lien'), null);
});
