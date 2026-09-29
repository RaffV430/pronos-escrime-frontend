import test from 'node:test';
import assert from 'node:assert/strict';
import { clubDay, fencerDay } from '../src/components/clubDay.js';

const pools = [
  {
    id: 1,
    name: 'Poule 2',
    strip: '11',
    startsAt: '2026-09-29T06:00:00Z',
    isFinal: true,
    fencers: [
      { name: 'ROGER WALLERAND', wins: 6, losses: 0, indicator: 15, firstResultAt: 'x' },
      { name: 'DOSA DANIEL', wins: 2, losses: 4, indicator: -1, firstResultAt: 'x' },
    ],
  },
  {
    id: 2,
    name: 'Poule 4',
    isFinal: false,
    fencers: [
      { name: 'HEBEY MAXIMILIEN', wins: 2, losses: 1, indicator: 3, firstResultAt: 'x' },
      { name: 'SIESS MICHAL', wins: null, losses: null, indicator: null },
    ],
  },
];
const m = (id, round, player1, player2, extra = {}) => ({ id, round, player1, player2, ...extra });
const matches = [
  m(1, 'T32', 'ROGER WALLERAND', 'BYE X', { isFinished: true, winner: 1, score1: 15, score2: 8, strip: '5' }),
  m(2, 'T16', 'KLEIN LUIS', 'Roger Wallerand', { isFinished: false, strip: 'Blue', startsAt: '2026-09-29T08:40:00Z' }),
  m(3, 'T32', 'DOSA DANIEL', 'BEM MACIEJ', { isFinished: true, winner: 2, score1: 12, score2: 15 }),
  m(9, 'T32', 'DOSA DANIEL', 'OLD', { resultType: 'CANCELLED' }),
];

test('a club fencer’s day: pool balance, bouts from their side, next opponent', () => {
  const roger = fencerDay('Roger Wallerand', pools, matches);
  assert.deepEqual(
    [roger.pool.name, roger.pool.wins, roger.pool.indicator, roger.pool.final],
    ['Poule 2', 6, 15, true],
  );
  assert.deepEqual(
    roger.bouts.map((b) => [b.round, b.won, b.score]),
    [
      ['T32', true, [15, 8]],
      ['T16', null, null],
    ],
  );
  assert.equal(roger.status.kind, 'next');
  assert.equal(roger.status.bout.opponent, 'KLEIN LUIS');
  assert.equal(roger.status.bout.strip, 'Blue');
  const dosa = fencerDay('DOSA DANIEL', pools, matches);
  assert.deepEqual(
    dosa.bouts.map((b) => b.score),
    [[12, 15]],
    'cancelled bout ignored, score from his side',
  );
  assert.deepEqual([dosa.status.kind, dosa.status.round], ['out', 'T32']);
  assert.equal(fencerDay('HEBEY MAXIMILIEN', pools, []).status.kind, 'live');
  assert.equal(fencerDay('SIESS MICHAL', pools, []).status.kind, 'upcoming');
  assert.equal(fencerDay('Inconnu', pools, matches).status.kind, 'absent');
});

test('medals: individual semi-final loss is bronze, team goes to the bronze bout', () => {
  const final = [m(1, 'T2', 'A', 'B', { isFinished: true, winner: 2, score1: 13, score2: 15 })];
  assert.equal(fencerDay('A', [], final).status.medal, 'silver');
  assert.equal(fencerDay('B', [], final).status.medal, 'gold');
  const semi = [m(1, 'T4', 'A', 'B', { isFinished: true, winner: 2 })];
  assert.equal(fencerDay('A', [], semi).status.medal, 'bronze');
  assert.equal(fencerDay('A', [], semi, { team: true }).status.label, 'Match pour le bronze');
});

test('club list: only fencers of this event, active first, duplicates removed', () => {
  const list = clubDay(
    ['DOSA DANIEL', 'Roger Wallerand', 'ROGER WALLERAND', 'Absent Paul', 'HEBEY MAXIMILIEN'],
    pools,
    matches,
  );
  assert.deepEqual(
    list.map((d) => d.name),
    ['Roger Wallerand', 'HEBEY MAXIMILIEN', 'DOSA DANIEL'],
  );
});
