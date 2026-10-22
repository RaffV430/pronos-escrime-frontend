import test from 'node:test';
import assert from 'node:assert/strict';
import { watchTableauByes } from '../src/lib/tableauByes.js';
import { buildTree } from '../src/components/bracketTree.js';
test('épreuve déjà ouverte : 17 rencontres inchangées, puis 15 exempts importés et affichés', async () => {
  const matches = Array.from({ length: 17 }, (_, i) => ({
    id: i + 1,
    round: 'T64',
    sourceKey: `fixture:${i + 16}`,
    player1: `A${i}`,
    player2: `B${i}`,
  }));
  const before = structuredClone(matches);
  const byes = Array.from({ length: 15 }, (_, i) => ({ round: 'T64', pos: i + 1, name: `Synthetic ${i}` }));
  let incoming = [],
    visible = [];
  const watcher = watchTableauByes(
    41,
    async () => ({ competitionId: 41, byes: incoming }),
    (value) => {
      visible = value;
    },
  );
  await watcher.refresh();
  assert.equal(buildTree(matches, visible).rounds[0].slots.filter((s) => s.advance).length, 0);
  incoming = byes;
  await watcher.refresh();
  const slots = buildTree(matches, visible).rounds[0].slots;
  assert.equal(slots.filter((s) => s.advance).length, 15);
  assert.equal(slots.filter((s) => s.match).length, 17);
  assert.deepEqual(matches, before);
  incoming = [];
  await watcher.refresh();
  assert.deepEqual(visible, []);
});
test('coupure conserve les exempts ; ancienne réponse ignorée après changement d’épreuve', async () => {
  let visible = [{ round: 'T64', pos: 1, name: 'Synthetic' }];
  const broken = watchTableauByes(
    41,
    async () => {
      throw new Error('offline');
    },
    (v) => {
      visible = v;
    },
  );
  await broken.refresh();
  assert.equal(visible.length, 1);
  let resolve;
  let staleCalls = 0;
  const old = watchTableauByes(
    41,
    () =>
      new Promise((r) => {
        resolve = r;
      }),
    () => {
      staleCalls++;
    },
  );
  const running = old.refresh();
  old.stop();
  resolve({ competitionId: 41, byes: [] });
  await running;
  const wrong = watchTableauByes(
    42,
    async () => ({ competitionId: 41, byes: [] }),
    () => {
      staleCalls++;
    },
  );
  await wrong.refresh();
  assert.equal(staleCalls, 0);
});

for (const competitionId of [42, 43, 44, 7001]) {
  test(`exempts reçus sans rechargement pour toute épreuve : ${competitionId}`, async () => {
    let incoming = [];
    let visible = null;
    const watcher = watchTableauByes(
      competitionId,
      async (id) => {
        assert.equal(id, competitionId);
        return { competitionId: id, byes: incoming };
      },
      (value) => {
        visible = value;
      },
    );
    await watcher.refresh();
    assert.deepEqual(visible, []);
    incoming = [{ round: 'T128', pos: 3, name: 'Synthetic future' }];
    await watcher.refresh();
    assert.deepEqual(visible, incoming);
    watcher.stop();
  });
}

test('exempt sans prochain match : numéro et pays officiels conservés', () => {
  const byes = [{ round: 'T64', pos: 1, name: 'Synthetic A', seed: 1, country: 'FRA' }];
  const tree = buildTree(
    [{ id: 7, round: 'T64', sourceKey: 'fixture:2', player1: 'Synthetic B', player2: 'Synthetic C' }],
    byes,
  );
  assert.deepEqual(tree.rounds[0].slots[0].advance, { name: 'Synthetic A', seed: 1, country: 'FRA' });
});
test('ancien exempt : détails du tour suivant repris seulement pour la même identité', () => {
  const matches = [
    {
      id: 1,
      round: 'T32',
      sourceKey: 'fixture:1',
      player1: 'Synthetic A',
      player2: 'Synthetic B',
      seed1: 1,
      player1Country: 'FRA',
    },
  ];
  matches.push({ id: 9, round: 'T64', sourceKey: 'fixture:3', player1: 'Synthetic C', player2: 'Synthetic D' });
  const tree = buildTree(matches, [{ round: 'T64', pos: 1, name: 'Synthetic A' }]);
  assert.deepEqual(tree.rounds[0].slots[0].advance, { name: 'Synthetic A', seed: 1, country: 'FRA' });
});
