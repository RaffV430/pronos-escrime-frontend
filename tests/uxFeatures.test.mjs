import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUndoPrediction,
  inferredProfile,
  notificationProfile,
  restoreBody,
  seasonCurve,
  pointDetails,
  nextOpponent,
  isBigGain,
  readUx,
} from '../src/lib/uxFeatures.js';
test('les profils gardent les horaires silencieux et la portée du compte', () => {
  const p = notificationProfile('follow', { quietEnabled: true, timezone: 'Europe/Paris', followAll: false });
  assert.equal(inferredProfile(p), 'follow');
  assert.equal(p.quietEnabled, true);
  assert.equal(p.followAll, false);
  assert.equal(p.newMatches, false);
  assert.equal(p.fencerEntries, true);
  assert.equal(inferredProfile(notificationProfile('both', p)), 'both');
  assert.equal(inferredProfile({ ...p, newMatches: true }), 'custom');
});
test('annuler restaure un vainqueur seul sans le transformer en score exact', () => {
  assert.deepEqual(restoreBody({ winnerOnly: true, predictedScore1: 0, predictedScore2: 1 }), { winner: 2 });
  assert.deepEqual(restoreBody({ winnerOnly: false, predictedScore1: 10, predictedScore2: 8 }), {
    predictedScore1: 10,
    predictedScore2: 8,
  });
  assert.equal(restoreBody(null), null);
});
test('la courbe utilise les points réels dans l’ordre chronologique sans fabriquer de rang', () => {
  const items = [
    { id: 2, date: '2026-10-12', points: 4 },
    { id: 1, date: '2026-10-01', points: 8 },
  ];
  assert.deepEqual(
    seasonCurve(items).map((r) => r.cumulative),
    [8, 12],
  );
  assert.equal(items[0].id, 2);
  assert.equal('rank' in seasonCurve(items)[0], false);
});
test('le détail ne double pas le multiplicateur appliqué par le serveur', () => {
  assert.equal(pointDetails({ pointsEarned: 8, bonusPoints: 2 }, { pointsMultiplier: 2 }).total, 10);
  assert.deepEqual(pointDetails({ pointsEarned: 8, bonusPoints: 2 }, { pointsMultiplier: 2 }).parts, [
    'Bon vainqueur : +2',
    'Score exact : +6',
    'Bonus outsider : +2',
    '×2 déjà inclus',
  ]);
  assert.equal(pointDetails({ pointsEarned: 4 }, { pointsPending: true }), null);
});
test('aucun adversaire ni gros gain déduit quand les données ne le prouvent pas', () => {
  assert.equal(nextOpponent({ player1: 'A', player2: 'B', isFinished: true }, 'A'), null);
  assert.equal(nextOpponent({ player1: 'A', player2: 'B' }, 'A'), 'B');
  assert.equal(nextOpponent({ player1: 'A', player2: 'B' }, 'C'), null);
  assert.equal(isBigGain({ type: 'Match', points: 4, details: ['Score exact : +3'] }), true);
  assert.equal(isBigGain({ type: 'Match', points: 4, details: ['Bonus outsider'] }), false);
  assert.equal(isBigGain({ type: 'Poule', points: 6 }), true);
  assert.equal(isBigGain({ type: 'Podium', points: 29 }), false);
  assert.equal(isBigGain({ type: 'Podium', points: 30 }), true);
  assert.equal(isBigGain({ type: 'Match', points: null }), false);
});
test('un stockage indisponible ne bloque pas les préférences', () => {
  assert.equal(
    readUx(4, {
      getItem() {
        throw new Error();
      },
    }).adapted,
    false,
  );
});

test('annulation refusée après clôture, résultat ou modification sur un autre appareil', () => {
  const p = { userId: 4, predictedScore1: 10, predictedScore2: 8, winnerOnly: false };
  const m = { isFinished: false, predictions: [p], closesAt: '2026-10-13T12:00:00Z' };
  const now = Date.parse('2026-10-13T11:59:59Z');
  assert.equal(canUndoPrediction(m, p, 4, now), true);
  assert.equal(canUndoPrediction(m, p, 4, now + 1000), false);
  assert.equal(canUndoPrediction({ ...m, isFinished: true }, p, 4, now), false);
  assert.equal(canUndoPrediction({ ...m, predictions: [{ ...p, predictedScore2: 7 }] }, p, 4, now), false);
  assert.equal(canUndoPrediction(m, p, 6, now), false);
  assert.equal(canUndoPrediction(m, null, 4, now), false);
});
