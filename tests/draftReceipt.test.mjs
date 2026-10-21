import test from 'node:test';
import assert from 'node:assert/strict';
import { settleDraftEntries } from '../src/lib/draftReceipt.js';

test('accusé après rechargement : disparaît de la restauration et du stockage', () => {
  const choice = { score1: '', score2: 15, winner: 2 };
  assert.deepEqual(settleDraftEntries({ stored: { 42: choice }, recoverable: { 42: choice }, active: {} }, [42]), {
    value: null,
    recoverable: null,
  });
});
test('accusé partiel : conserve les autres choix non restaurés et les nouvelles saisies', () => {
  const old = { 42: { winner: 2 }, 43: { winner: 1 } };
  const active = { 44: { score1: 15, score2: '9' }, 43: { winner: 2 } };
  const before = structuredClone({ old, active });
  const result = settleDraftEntries({ stored: old, recoverable: old, active }, [42]);
  assert.deepEqual(result.value, { 43: { winner: 2 }, 44: { score1: 15, score2: '9' } });
  assert.deepEqual(result.recoverable, { 43: { winner: 1 } });
  assert.deepEqual({ old, active }, before);
});
test('accusé inconnu ou répété : aucune suppression supplémentaire', () => {
  const draft = { 43: { winner: 1 } };
  const first = settleDraftEntries({ stored: draft, recoverable: draft }, [42]);
  assert.deepEqual(first, { value: draft, recoverable: draft });
  assert.deepEqual(settleDraftEntries({ stored: first.value, recoverable: first.recoverable }, [42]), first);
});

test('nouveau swipe après reprise : garde les brouillons non restaurés même après accusé partiel', async () => {
  const { mergeDraftEntries } = await import('../src/lib/draftReceipt.js');
  const independent = { score1: '1', score2: '', winner: null };
  const queued = { score1: '', score2: 15, winner: 2 };
  const stored = { 1: independent, 2: queued, 3: queued };
  const afterAck = settleDraftEntries({ stored, recoverable: stored, active: {} }, [2]);
  const newSwipe = { 4: { score1: 15, score2: '', winner: 1 } };
  const edited = mergeDraftEntries({ stored: afterAck.value, recoverable: afterAck.recoverable, active: newSwipe });
  assert.deepEqual(edited.value, { 1: independent, 3: queued, ...newSwipe });
  assert.deepEqual(edited.recoverable, { 1: independent, 3: queued });
  const sent = settleDraftEntries({ stored: edited.value, recoverable: edited.recoverable }, [3, 4]);
  assert.deepEqual(sent, { value: { 1: independent }, recoverable: { 1: independent } });
});
test('annulation et suppression explicites ne ressuscitent pas ; les autres saisies restent', async () => {
  const { mergeDraftEntries } = await import('../src/lib/draftReceipt.js');
  const stored = { 1: { winner: 1 }, 2: { winner: 2 }, 3: { score1: '1' } };
  const result = mergeDraftEntries({
    stored,
    recoverable: stored,
    active: { 2: { score1: 15, score2: '9' } },
    removed: [1],
  });
  assert.deepEqual(result.value, { 2: { score1: 15, score2: '9' }, 3: { score1: '1' } });
  assert.deepEqual(result.recoverable, { 3: { score1: '1' } });
  assert.deepEqual(mergeDraftEntries({ stored: result.value, active: {}, removed: [2] }).value, { 3: { score1: '1' } });
});
test('vider les récupérables ne supprime pas les saisies actives ; dernière suppression nettoie le stockage', async () => {
  const { mergeDraftEntries } = await import('../src/lib/draftReceipt.js');
  assert.deepEqual(mergeDraftEntries({ stored: { 1: {}, 2: {} }, active: { 2: { winner: 2 } }, removed: [1] }).value, {
    2: { winner: 2 },
  });
  assert.equal(mergeDraftEntries({ stored: { 1: {} }, removed: [1] }).value, null);
});
