import test from 'node:test';
import assert from 'node:assert/strict';
import { teamLiveRows } from '../src/lib/teamLiveOverview.js';
const now = Date.now();
const rows = new Map([
  ['w', { matchId: 'w', gender: 'women', updatedAt: new Date(now).toISOString() }],
  ['m', { matchId: 'm', gender: 'men', updatedAt: new Date(now).toISOString() }],
]);
test('la sélection permet plusieurs matchs et les filtres hommes/femmes restent indépendants', () => {
  assert.equal(teamLiveRows(rows, { now }).length, 2);
  assert.deepEqual(
    teamLiveRows(rows, { now, gender: 'women' }).map((x) => x.matchId),
    ['w'],
  );
  assert.deepEqual(
    teamLiveRows(rows, { now, selected: new Set(['w', 'm']) }).map((x) => x.matchId),
    ['w', 'm'],
  );
  assert.deepEqual(teamLiveRows(rows, { now, selected: new Set() }), []);
  assert.deepEqual(teamLiveRows(rows, { now, selected: new Set(['w']), gender: 'men' }), []);
});
test('une nouvelle rencontre sur la même piste ne remplace pas un match choisi et les signaux périmés disparaissent', () => {
  const changed = new Map(rows);
  changed.delete('w');
  changed.set('new', { ...rows.get('w'), matchId: 'new' });
  assert.deepEqual(teamLiveRows(changed, { now, selected: new Set(['w']) }), []);
  assert.deepEqual(teamLiveRows(rows, { now: now + 180001 }), []);
  assert.equal(rows.size, 2);
});

import { relayNamesForMatch } from '../src/lib/teamLiveOverview.js';
const match = { id: 10, player1: 'FRANCE', player2: 'HUNGARY' };
const signal = {
  matchId: 'team-live:match:10',
  officialMatchId: 10,
  competitionId: 45,
  player1: 'HUNGARY',
  player2: 'FRANCE',
  fencer1: { name: 'NOM Hongrie' },
  fencer2: { name: 'NOM France long' },
  updatedAt: new Date(now).toISOString(),
};
const scores = new Map([[signal.matchId, signal]]);
test('les noms du détail suivent les équipes affichées après inversion du côté officiel', () => {
  assert.deepEqual(relayNamesForMatch(scores, match, 45, now), ['NOM France long', 'NOM Hongrie']);
  assert.deepEqual(relayNamesForMatch(scores, { ...match, player1: 'HUNGARY', player2: 'FRANCE' }, 45, now), [
    'NOM Hongrie',
    'NOM France long',
  ]);
  const relay = new Map([[signal.matchId, { ...signal, fencer2: { name: 'RELAYEUR suivant' } }]]);
  assert.deepEqual(relayNamesForMatch(relay, match, 45, now), ['RELAYEUR suivant', 'NOM Hongrie']);
  assert.equal(signal.fencer2.name, 'NOM France long');
});
test('aucun nom d’une autre épreuve, d’un ancien signal, d’une rencontre terminée ou d’équipes modifiées', () => {
  assert.equal(relayNamesForMatch(scores, match, 46, now), null);
  assert.equal(relayNamesForMatch(scores, match, 45, now + 180001), null);
  assert.equal(relayNamesForMatch(scores, { ...match, isFinished: true }, 45, now), null);
  assert.equal(relayNamesForMatch(scores, { ...match, player2: 'ITALY' }, 45, now), null);
  assert.equal(relayNamesForMatch(scores, { ...match, id: 11 }, 45, now), null);
  assert.equal(
    relayNamesForMatch(new Map([...scores, ['duplicate', { ...signal, matchId: 'duplicate' }]]), match, 45, now),
    null,
  );
});

import { teamMatchForRow } from '../src/lib/teamLiveOverview.js';
import { livePredictionLabel } from '../src/lib/livePistes.js';
test('la carte retrouve uniquement son match importé et remet le pronostic dans le sens des équipes', () => {
  const m = { ...match, competitionId: 45, predictions: [{ userId: 7, predictedScore1: 45, predictedScore2: 36 }] };
  const linked = teamMatchForRow(signal, [m]);
  assert.equal(linked.match.id, 10);
  assert.equal(livePredictionLabel(linked.match, linked.live, 7), 'Votre prono : 36 – 45');
  assert.equal(livePredictionLabel(linked.match, linked.live, 8), 'Votre prono : non renseigné');
  assert.equal(teamMatchForRow({ ...signal, competitionId: 46 }, [m]), null);
  assert.equal(teamMatchForRow({ ...signal, officialMatchId: null }, [m]), null);
  assert.equal(teamMatchForRow({ ...signal, player2: 'ITALY' }, [m]), null);
  assert.deepEqual(m.predictions, [{ userId: 7, predictedScore1: 45, predictedScore2: 36 }]);
});
