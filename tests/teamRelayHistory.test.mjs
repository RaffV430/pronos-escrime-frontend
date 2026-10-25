import test from 'node:test';
import assert from 'node:assert/strict';
import { relayGroups } from '../src/lib/teamRelayHistory.js';
import { ftlPresentation } from '../src/lib/pisteLive.js';
test('groups recorded events only, keeps gaps and corrections and separates relay changes', () => {
  const events = [
    { at: 'a', period: 6, by: 'start', score1: 27, score2: 24 },
    { at: 'b', period: 6, by: 'gap', score1: 27, score2: 27 },
    { at: 'c', period: 7, by: 'relay', score1: 27, score2: 27 },
    { at: 'd', period: 7, by: 'correction', score1: 26, score2: 27 },
  ];
  const groups = relayGroups(events);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.flatMap((g) => g.events),
    events,
  );
  assert.equal(groups[0].period, 6);
  assert.equal(groups[1].events.at(-1).by, 'correction');
  assert.deepEqual(relayGroups(), []);
});
test('recorded fencers and scores follow side inversion without changing source history', () => {
  const event = { period: 2, by: 1, score1: 6, score2: 4, fencer1Name: 'SYNTH A', fencer2Name: 'SYNTH B' };
  const result = ftlPresentation({ player1: 'TEAM A', player2: 'TEAM B' }, { ftlLeftPlayer: 2, history: [event] });
  assert.equal(result.live.history[0].fencer1Name, 'SYNTH B');
  assert.equal(result.live.history[0].score1, 4);
  assert.equal(event.fencer1Name, 'SYNTH A');
});
