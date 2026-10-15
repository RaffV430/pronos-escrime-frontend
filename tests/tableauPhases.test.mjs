import test from 'node:test';
import assert from 'node:assert/strict';
import { roundLabel, groupMatches } from '../src/components/matchPresentation.js';
import { buildTree } from '../src/components/bracketTree.js';
test('J1 et J2 : groupes distincts, ordre chronologique et aucune disparition du préliminaire dans un arbre', () => {
  const matches = [
    { id: 2, round: 'T64', sourceKey: 'Table of 64:1' },
    { id: 1, round: 'J1:T64', sourceKey: 'J1:Table of 64:1' },
  ];
  assert.deepEqual(
    groupMatches(matches).map((g) => g.round),
    ['J1:T64', 'T64'],
  );
  assert.equal(roundLabel('J1:T64'), 'T64 · J1 préliminaire');
  assert.equal(roundLabel('T64', true), 'T64 · J2 principal');
  assert.equal(buildTree(matches), null);
});

test('arbre J1 : positions et identifiants conservés, arrêt au T64, aucun tour principal inventé', () => {
  const prior = {
    id: 101,
    round: 'J1:T256',
    sourceKey: 'J1:Table of 256:120',
    player1: 'A',
    player2: 'B',
    isFinished: true,
    winner: 1,
  };
  const next = { id: 102, round: 'J1:T128', sourceKey: 'J1:Table of 128:60', player1: 'A', player2: 'C' };
  const data = [prior, next];
  const before = structuredClone(data);
  const tree = buildTree(data, [{ round: 'J1:T256', pos: 119, name: 'C' }]);
  assert.deepEqual(
    tree.rounds.map((r) => r.round),
    ['J1:T256', 'J1:T128', 'J1:T64'],
  );
  assert.equal(tree.rounds[0].slots[119].match, prior);
  assert.equal(tree.rounds[1].slots[59].match, next);
  assert.equal(tree.rounds[0].slots[118].advance.name, 'C');
  assert.equal(tree.rounds[2].slots[29].match, null);
  assert.deepEqual(data, before);
  assert.equal(buildTree([prior, { ...prior, id: 103 }]), null);
  assert.equal(buildTree([{ ...prior, sourceKey: null }]), null);
});
