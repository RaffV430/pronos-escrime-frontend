import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTableauPhase } from '../src/components/tableauPhase.js';
import { isMatchClosed } from '../src/components/matchPresentation.js';
const now = Date.parse('2026-10-16T09:00:00Z');
const choose = (matches) => defaultTableauPhase(matches, (m) => isMatchClosed(m, now));
const j1 = { id: 1, round: 'J1:T64', closesAt: new Date(now + 10000).toISOString() };
const j2 = { id: 2, round: 'T64', closesAt: new Date(now + 86400000).toISOString() };
test('J1 ouvert avant J2, même si J2 est déjà publié et ouvert', () => {
  assert.equal(choose([j2, j1]), 'preliminary');
});
test('J2 ouvert dès que les pronostics du J1 sont clos, sans attendre tous ses résultats', () => {
  for (const lock of [
    { liveDetectedAt: new Date(now).toISOString() },
    { isLocked: true },
    { isFinished: true },
    { closesAt: new Date(now).toISOString() },
    { syncIssue: 'source' },
    { timingUnverified: true },
  ]) {
    assert.equal(choose([{ ...j1, ...lock }, j2]), 'main');
  }
});
test('réouverture J1 selon la règle existante, mais une détection live reste prioritaire', () => {
  const reopened = { ...j1, isLocked: true, manualUnlockUntil: new Date(now + 10000).toISOString() };
  assert.equal(choose([reopened, j2]), 'preliminary');
  assert.equal(choose([{ ...reopened, liveDetectedAt: new Date(now).toISOString() }, j2]), 'main');
});
test('sans phase ouverte : J1 en cours, puis principal à venir ou résultats J2', () => {
  assert.equal(choose([{ ...j1, isLocked: true }]), 'preliminary');
  assert.equal(choose([{ ...j1, isFinished: true }]), 'main');
  assert.equal(
    choose([
      { ...j1, isFinished: true },
      { ...j2, isFinished: true },
    ]),
    'main',
  );
  assert.equal(choose([j2]), 'main');
});
