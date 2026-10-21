import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptMatchId, draftMatchesReceipt } from '../src/lib/matchReceipt.js';
import { settleDraftEntries } from '../src/lib/draftReceipt.js';

test('un accusé ne concerne que son épreuve et un résultat effectif', () => {
  assert.equal(receiptMatchId({ key: 'match:42', ok: true }, [{ id: 42 }]), 42);
  for (const receipt of [
    { key: 'match:43', ok: true },
    { key: 'pool:42', ok: true },
    { key: 'match:42', queued: true },
  ])
    assert.equal(receiptMatchId(receipt, [{ id: 42 }]), null);
});
test('retour sur épreuve quittée : retirer le choix envoyé, conserver le brouillon indépendant', () => {
  const stored = { 42: { winner: 2, score1: '', score2: 15 }, 43: { score1: '1', score2: '' } };
  const receipt = { key: 'match:42', ok: true, data: { winner: 2 } };
  assert.equal(draftMatchesReceipt(stored[receiptMatchId(receipt, [{ id: 42 }, { id: 43 }])], receipt.data), true);
  assert.deepEqual(settleDraftEntries({ stored, recoverable: stored }, [42]), {
    value: { 43: stored[43] },
    recoverable: { 43: stored[43] },
  });
});
test('ancien accusé : ne pas retirer un vainqueur modifié ni un score exact ajouté après l’envoi', () => {
  assert.equal(draftMatchesReceipt({ winner: 1, score1: 15, score2: '' }, { winner: 2 }), false);
  assert.equal(draftMatchesReceipt({ winner: null, score1: 15, score2: '9' }, { winner: 1 }), false);
  assert.equal(draftMatchesReceipt({ score1: '15', score2: '9' }, { predictedScore1: 15, predictedScore2: 9 }), true);
  assert.equal(draftMatchesReceipt({ score1: '', score2: 15 }, { predictedScore1: 0, predictedScore2: 15 }), false);
  assert.equal(draftMatchesReceipt({ winner: 1 }, undefined), false);
});
