import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeFor } from '../src/lib/challengeCard.js';
test('le lien de défi ouvre le match sans transmettre les paramètres de session', () => {
  const m = { id: 42, player1: 'ALPHA A', player2: 'BETA B' };
  const c = challengeFor(
    m,
    { predictedScore1: 10, predictedScore2: 8 },
    'http://localhost:5173/pronostiquer/test-1/vet-50-23/tableau?refonte=1&token=fictif&invite=fictif',
    true,
  );
  const url = new URL(c.url);
  assert.equal(url.pathname, '/pronostiquer/test-1/vet-50-23/tableau');
  assert.equal(url.searchParams.get('match'), '42');
  assert.equal(url.searchParams.get('refonte'), '1');
  assert.equal(url.searchParams.has('token'), false);
  assert.equal(url.searchParams.has('invite'), false);
  assert.equal(c.local, true);
  assert.match(c.text, /ALPHA A \(10–8\)/);
});
test('une sélection de vainqueur seul ne prétend pas avoir un score exact', () => {
  const c = challengeFor(
    { id: 1, player1: 'A', player2: 'B' },
    { predictedScore1: 0, predictedScore2: 1, winnerOnly: true },
    'https://www.pronos-escrime.fr/pronostiquer/1/2/tableau',
    true,
  );
  assert.match(c.text, /B vainqueur/);
  assert.equal(c.text.includes('0–1'), false);
  assert.equal(c.local, false);
  assert.match(
    challengeFor({ id: 1, player1: 'A', player2: 'B' }, null, 'http://localhost:5173/pronostiquer/1/2/tableau').text,
    /qui gagne/,
  );
});

test('challenge hides the winner and score unless explicitly requested', () => {
  const c = challengeFor(
    { id: 1, player1: 'A', player2: 'B' },
    { predictedScore1: 10, predictedScore2: 3 },
    'http://localhost:5173/test',
  );
  assert.equal(c.winner, null);
  assert.equal(c.revealPrediction, false);
  assert.equal(c.text, 'A ou B : qui gagne ?');
  assert.equal(new URL(c.url).search, '?match=1');
});
