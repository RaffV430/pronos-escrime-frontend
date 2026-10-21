import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deckOrder,
  fitsIndicator,
  indicatorBounds,
  picksFrom,
  poolDone,
  poolTotals,
  quickIndicators,
} from '../src/lib/poolDeck.js';

const pool = (name, n, extra = {}) => ({
  name,
  fencers: Array.from({ length: n }, (_, i) => ({ id: `${name}-${i}`, name: `T${i}`, ...(extra[i] || {}) })),
});

test('indice : bornes et valeurs rapides selon les victoires', () => {
  assert.deepEqual(indicatorBounds(6, 6), { min: 6, max: 30 });
  assert.deepEqual(indicatorBounds(0, 6), { min: -30, max: -6 });
  assert.deepEqual(quickIndicators(3, 6), [-12, -10, -5, 0, 5, 10, 12]); // 3 V – 3 D : ±12 au plus
  assert.deepEqual(quickIndicators(6, 6), [6, 10, 15]);
  assert.deepEqual(quickIndicators(0, 6), [-15, -10, -6]);
  assert.ok(fitsIndicator(null, 0, 6));
  assert.ok(!fitsIndicator(5, 0, 6));
});

test('contrôle du total : 21 victoires pour 7 tireurs, sans contrôle avec un tireur sorti', () => {
  const p = pool('Poule 1', 7);
  const picks = Object.fromEntries(p.fencers.map((f, i) => [f.id, { wins: 6 - i }]));
  assert.equal(poolTotals(p, picks).status, 'ok');
  picks[p.fencers[0].id] = { wins: 4 };
  assert.deepEqual((({ sum, expected, status }) => ({ sum, expected, status }))(poolTotals(p, picks)), {
    sum: 19,
    expected: 21,
    status: 'check',
  });
  delete picks[p.fencers[6].id];
  assert.equal(poolTotals(p, picks).status, 'partial');
  const out = pool('Poule 2', 6, { 5: { status: 'DNS' } });
  const all = Object.fromEntries(out.fencers.slice(0, 5).map((f) => [f.id, { wins: 2 }]));
  assert.deepEqual([poolTotals(out, all).status, poolTotals(out, all).expected], ['ok', null]);
});

test('avancement et ordre des poules (mes tireurs d’abord)', () => {
  const pools = [pool('Poule 10', 6), pool('Poule 2', 6), pool('Poule 1', 6)];
  assert.deepEqual(
    deckOrder(pools).map((p) => p.name),
    ['Poule 1', 'Poule 2', 'Poule 10'],
  );
  assert.deepEqual(
    deckOrder(pools, { mineFirst: true, hasMine: (p) => p.name === 'Poule 10' }).map((p) => p.name),
    ['Poule 10', 'Poule 1', 'Poule 2'],
  );
  const p = pools[2];
  const picks = { [p.fencers[0].id]: { wins: 3 } };
  assert.ok(!poolDone(p, picks));
  assert.ok(poolDone(p, picks, (f) => f.id === p.fencers[0].id));
  assert.deepEqual(picksFrom([{ fencers: [{ id: 1, prediction: { wins: 2, indicator: -3 } }, { id: 2 }] }]), {
    1: { wins: 2, indicator: -3 },
  });
});
