import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarPredictionPath } from '../src/lib/calendarLinks.js';
test('carte J1 vers poules, carte J2 vers principal, aucune dépendance à la date actuelle', () => {
  const event = { tournamentId: 7, tournamentName: 'Test', competitions: [{ id: 20, name: 'Senior Foil' }] };
  assert.equal(calendarPredictionPath(event), '/pronostiquer/test-7/senior-foil-20/poules');
  assert.equal(
    calendarPredictionPath({ ...event, predictionView: 'tableau', tableauPhase: 'main' }),
    '/pronostiquer/test-7/senior-foil-20/tableau?phase=main',
  );
  assert.equal(calendarPredictionPath({ ...event, competitions: [] }), '/pronostiquer/test-7');
});

test('carte J1 après poules vers préliminaire distinct du principal', () => {
  assert.equal(
    calendarPredictionPath({
      tournamentId: 7,
      tournamentName: 'Test',
      competitions: [{ id: 20, name: 'Foil' }],
      predictionView: 'tableau',
      tableauPhase: 'preliminary',
    }),
    '/pronostiquer/test-7/foil-20/tableau?phase=preliminary',
  );
});
