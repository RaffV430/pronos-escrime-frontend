import test from 'node:test';
import assert from 'node:assert/strict';
import { tabFromPath, pathForTab } from '../src/lib/routes.js';

test('une adresse par section, et retour', () => {
  assert.equal(tabFromPath('/'), 'home');
  assert.equal(tabFromPath('/resultats'), 'results');
  assert.equal(tabFromPath('/classements/'), 'leaderboard');
  assert.equal(tabFromPath('/tournoi/3'), null);
  assert.equal(tabFromPath('/confidentialite'), null);
  assert.equal(pathForTab('season'), '/ma-saison');
  assert.equal(pathForTab('play'), '/pronostiquer');
  assert.equal(tabFromPath('/pronostiquer'), 'play');
  assert.equal(pathForTab('inconnu'), '/');
  for (const tab of [
    'home',
    'me',
    'live',
    'play',
    'mine',
    'season',
    'results',
    'leaderboard',
    'community',
    'account',
    'admin',
  ])
    assert.equal(tabFromPath(pathForTab(tab)), tab);
});

import { slug, idOf, parseLocation, pathFor, publicPath } from '../src/lib/routes.js';
test('adresses par tournoi et par épreuve, lisibles, anciens liens compris', () => {
  assert.equal(slug('Etampes CN M17/M20'), 'etampes-cn-m17-m20');
  assert.equal(slug("Junior Women's Foil"), 'junior-womens-foil');
  assert.equal(slug('Fleuret Dames M17 — Épreuve nationale'), 'fleuret-dames-m17-epreuve-nationale');
  assert.equal(idOf('etampes-cn-m17-m20-4'), 4);
  assert.equal(idOf('12'), 12);
  assert.equal(idOf('etampes'), null);
  const t = { id: 4, name: 'Etampes CN M17/M20' },
    e = { id: 16, name: "Junior Women's Foil" };
  assert.equal(
    pathFor('play', { tournament: t, event: e, view: 'pools' }),
    '/pronostiquer/etampes-cn-m17-m20-4/junior-womens-foil-16/poules',
  );
  assert.equal(pathFor('leaderboard', { tournament: t }), '/classements/etampes-cn-m17-m20-4');
  assert.equal(pathFor('admin'), '/admin');
  assert.deepEqual(parseLocation('/pronostiquer/etampes-cn-m17-m20-4/junior-womens-foil-16/poules'), {
    tab: 'play',
    tournamentId: 4,
    eventId: 16,
    view: 'pools',
  });
  assert.deepEqual(parseLocation('/pronostiquer', '?tournament=4&event=16&view=pools'), {
    tab: 'play',
    tournamentId: 4,
    eventId: 16,
    view: 'pools',
  });
  assert.equal(parseLocation('/resultats/x-4/y-16').eventId, 16);
  assert.equal(tabFromPath('/classements/etampes-4'), 'leaderboard');
  assert.equal(tabFromPath('/tournoi/etampes-4'), null);
  assert.equal(publicPath(t, e), '/tournoi/etampes-cn-m17-m20-4/junior-womens-foil-16');
});
