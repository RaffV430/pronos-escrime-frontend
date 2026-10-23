import test from 'node:test';
import assert from 'node:assert/strict';
import { recentMatchDetails, chronologicalRecentMatches } from '../src/lib/recentMatchDetails.js';
test('une défaite garde le score du tireur en premier, y compris zéro, sans muter la réponse', () => {
  const row = {
    won: false,
    score: [0, 15],
    opponent: 'Exemple',
    date: '2026-10-23T10:00:00Z',
    tournament: 'Tournoi A',
    competition: 'M20',
  };
  const before = structuredClone(row);
  const d = recentMatchDetails(row);
  assert.equal(d.outcome, 'Défaite');
  assert.equal(d.score, '0–15');
  assert.equal(d.context, 'Tournoi A · M20');
  assert.deepEqual(row, before);
});
test('un forfait ne présente jamais un score comme réellement joué', () => {
  const d = recentMatchDetails({ won: true, medical: true, score: [15, 0] });
  assert.equal(d.outcome, 'Victoire');
  assert.match(d.score, /Retrait \/ forfait/);
  assert.equal(d.score.includes('15'), false);
});
test('dates et scores manquants restent explicitement inconnus', () => {
  const d = recentMatchDetails({ won: false, date: 'incorrect', score: [3, null] });
  assert.equal(d.date, 'Date non renseignée');
  assert.equal(d.score, 'Score non renseigné');
  assert.equal(d.opponent, 'Adversaire non renseigné');
  assert.equal(d.context, 'Épreuve non renseignée');
});

test('les cinq matchs vont de l’ancien à gauche au récent à droite sans modifier la réponse', () => {
  const rows = Object.freeze([5, 4, 3, 2, 1].map((matchId) => Object.freeze({ matchId })));
  const displayed = chronologicalRecentMatches(rows);
  assert.deepEqual(
    displayed.map((row) => row.matchId),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    rows.map((row) => row.matchId),
    [5, 4, 3, 2, 1],
  );
  assert.equal(displayed[4], rows[0]);
});
test('l’ordre serveur départage les dates égales ou inconnues sans nouveau tri', () => {
  const rows = [
    { matchId: 9, date: null },
    { matchId: 8, date: null },
  ];
  assert.deepEqual(
    chronologicalRecentMatches(rows).map((row) => row.matchId),
    [8, 9],
  );
  assert.deepEqual(chronologicalRecentMatches([]), []);
  assert.equal(chronologicalRecentMatches([rows[0]])[0], rows[0]);
});
