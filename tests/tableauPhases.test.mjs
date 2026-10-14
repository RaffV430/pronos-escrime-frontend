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
