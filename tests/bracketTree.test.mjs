import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTree, entrantFrom, predictedWinner } from '../src/components/bracketTree.js';

const m = (round, pos, p1, c1, p2, c2, s1 = null, s2 = null, extra = {}) => ({
  id: `${round}-${pos}`,
  round,
  sourceKey: `${round}:${pos}`,
  player1: p1,
  player1Country: c1,
  player2: p2,
  player2Country: c2,
  score1: s1,
  score2: s2,
  winner: s1 === null ? null : s1 > s2 ? 1 : 2,
  isFinished: s1 !== null,
  ...extra,
});

// Extrait réel (Senior Men's Foil, CISM 2026) : le T32 n°1 est une exemption.
const matches = [
  m('T32', 2, 'DOSA DANIEL', 'HUN', 'BEM MACIEJ', 'POL', 15, 13),
  m('T32', 3, 'RZADKOWSKI ANDRZEJ', 'POL', 'SCHUSTER ALLAN', 'BRA', 15, 3),
  m('T32', 4, 'VIDALES FERNANDEZ JOSE', 'ESP', 'KLEIN LUIS', 'GER'),
  m('T16', 1, 'POGREBNIAK ANDRII', 'UKR', 'DOSA DANIEL', 'HUN'),
  m('T2', 1, 'DOSA DANIEL', 'HUN', 'ROGER WALLERAND', 'FRA'),
];

test('the tree has every round down to the final, each slot at its official position', () => {
  const tree = buildTree(matches);
  assert.equal(tree.base, 16);
  assert.deepEqual(
    tree.rounds.map((r) => [r.round, r.slots.length]),
    [
      ['T32', 16],
      ['T16', 8],
      ['T8', 4],
      ['T4', 2],
      ['T2', 1],
    ],
  );
  assert.equal(tree.rounds[0].slots[1].match.player1, 'DOSA DANIEL');
});

test('an empty first-round slot shows the exempt fencer found in the next round', () => {
  const tree = buildTree(matches);
  assert.deepEqual(tree.rounds[0].slots[0].advance, { name: 'POGREBNIAK ANDRII', country: 'UKR' });
  assert.equal(tree.rounds[0].slots[4].advance, null);
});

test('future slots show the official winner, else your predicted winner, else a placeholder', () => {
  const tree = buildTree(matches);
  const valueOf = (x) => (x.id === 'T32-4' ? { score1: '8', score2: '15' } : { score1: '', score2: '' });
  assert.deepEqual(entrantFrom(tree, 1, 3, valueOf), { kind: 'real', name: 'RZADKOWSKI ANDRZEJ', country: 'POL' });
  assert.deepEqual(entrantFrom(tree, 1, 4, valueOf), { kind: 'pick', name: 'KLEIN LUIS', country: 'GER' });
  assert.deepEqual(entrantFrom(tree, 1, 5, valueOf), { kind: 'tbd', name: 'Vainqueur T32 n°5' });
});

test('predicted winner needs two valid, different scores', () => {
  const x = matches[2];
  assert.equal(predictedWinner(x, { score1: '15', score2: '15' }), null);
  assert.equal(predictedWinner(x, { score1: '15', score2: '' }), null);
  assert.equal(predictedWinner(x, { score1: 15, score2: 9 }).name, 'VIDALES FERNANDEZ JOSE');
});

test('unreliable positions fall back to the list layout; cancelled matches are ignored', () => {
  assert.equal(buildTree([{ ...matches[0], sourceKey: null }]), null);
  assert.equal(buildTree([matches[0], { ...matches[1], sourceKey: 'T32:2' }]), null);
  const tree = buildTree([...matches, { ...matches[1], id: 'x', resultType: 'CANCELLED' }]);
  assert.ok(tree);
  assert.equal(buildTree([m('Bronze', 1, 'A', 'FRA', 'B', 'ITA')]), null);
});
