import test from 'node:test';
import assert from 'node:assert/strict';
import { tabFromPath, pathForTab } from '../src/lib/routes.js';

test('une adresse par section, et retour', () => {
  assert.equal(tabFromPath('/'), 'play');
  assert.equal(tabFromPath('/resultats'), 'results');
  assert.equal(tabFromPath('/classements/'), 'leaderboard');
  assert.equal(tabFromPath('/tournoi/3'), null);
  assert.equal(tabFromPath('/confidentialite'), null);
  assert.equal(pathForTab('season'), '/ma-saison');
  assert.equal(pathForTab('inconnu'), '/');
  for (const tab of ['play', 'mine', 'season', 'results', 'leaderboard', 'community', 'account', 'admin'])
    assert.equal(tabFromPath(pathForTab(tab)), tab);
});
