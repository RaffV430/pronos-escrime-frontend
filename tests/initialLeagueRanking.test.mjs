import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLeagueRanking } from '../src/lib/initialLeagueRanking.js';

test('le lien ouvre une seule fois, pas après le rechargement des délégations', () => {
  const selection = initialLeagueRanking('?league=2');
  assert.equal(selection.start(null), null);
  assert.equal(selection.start([{ id: 2 }]).id, 2);
  assert.equal(selection.start([{ id: 2 }, { id: 3 }]), null);
});

test('une sélection manuelle annule la réponse initiale encore en vol', () => {
  const selection = initialLeagueRanking('?league=2');
  const request = selection.start([{ id: 2 }]);
  selection.cancel();
  assert.equal(request.controller.signal.aborted, true);
  assert.equal(selection.start([{ id: 2 }]), null);
  const early = initialLeagueRanking('?league=2');
  early.cancel();
  assert.equal(early.start([{ id: 2 }]), null);
});

test('aucune ouverture sans identifiant valide et appartenance à la délégation', () => {
  for (const query of ['', '?league=-1', '?league=2.5', '?league=abc', '?league=999'])
    assert.equal(initialLeagueRanking(query).start([{ id: 2 }]), null);
});
