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
test('missing relay touch histories use official totals without inventing colored events', () => {
  const official = [
    { period: 1, score1: 5, score2: 3, fencer1Name: 'SYNTH A', fencer2Name: 'SYNTH B' },
    { period: 2, score1: 8, score2: 10 },
  ];
  const history = [{ at: 'a', period: 2, by: 1, score1: 7, score2: 9 }];
  const snapshot = structuredClone({ official, history });
  const groups = relayGroups(history, official);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].events, []);
  assert.equal(groups[0].official.score1, 5);
  assert.equal(groups[1].events.length, 1);
  assert.deepEqual({ official, history }, snapshot);
  const inverted = ftlPresentation({ player1: 'A', player2: 'B', officialRelays: official }, { ftlLeftPlayer: 2 });
  assert.equal(inverted.match.officialRelays[0].score1, 3);
  assert.equal(inverted.match.officialRelays[0].fencer1Name, 'SYNTH B');
});

test('ambiguous combined score updates stay neutral and zero placeholders do not create a false first relay', () => {
  const groups = relayGroups([
    { at: 'a', by: 'start', period: 2, score1: 0, score2: 0 },
    { at: 'b', by: 1, period: 1, score1: 1, score2: 0 },
    { at: 'c', by: 'double', period: 1, score1: 2, score2: 1 },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].period, 1);
  assert.equal(groups[0].events.at(-1).by, 'gap');
});

test('a real period correction never reorders observed score events', () => {
  const h = [
    { period: 2, by: 1, score1: 3, score2: 1 },
    { period: 1, by: 'correction', score1: 2, score2: 1 },
  ];
  assert.deepEqual(
    relayGroups(h).flatMap((g) => g.events),
    h,
  );
});
