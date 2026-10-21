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
