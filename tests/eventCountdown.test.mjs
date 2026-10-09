import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextEventStart } from '../src/lib/eventCountdown.js';
test('prochaine épreuve future, indépendante des matchs et des vieux tournois', () => {
  const now = Date.parse('2026-10-08T12:00Z');
  const data = [
    {
      competitions: [
        { id: 1, startsAt: '2026-10-01T09:00:00Z' },
        { id: 2, startsAt: null },
        { id: 3, startsAt: '2026-10-11T07:00:00Z' },
        { id: 4, startsAt: '2026-10-10T07:00:00Z' },
      ],
    },
  ];
  assert.equal(nextEventStart(data, now), '2026-10-10T07:00:00Z');
  assert.equal(nextEventStart(data, now, 3), '2026-10-11T07:00:00Z');
  assert.equal(nextEventStart(data, now, 1), null);
  assert.equal(nextEventStart([{ competitions: [{ startsAt: 'invalid' }] }], now), null);
});

import { nextCalendarEvent } from '../src/lib/eventCountdown.js';
test('home follows the calendar, advances after start and never invents a time', () => {
  const events = [
    { id: 'later', start: '2026-10-11', competitionIds: [3] },
    { id: 'next', start: '2026-10-10', competitionIds: [1, 2] },
  ];
  const tournaments = [{ name: 'Étampes', competitions: [
    { id: 1, name: 'Cadets hommes', startsAt: '2026-10-10T07:00:00Z' },
    { id: 2, name: 'Cadettes', startsAt: '2026-10-10T09:00:00Z' },
    { id: 3, name: 'Juniors', startsAt: '2026-10-11T07:00:00Z' },
  ] }];
  assert.equal(nextCalendarEvent(events, tournaments, Date.parse('2026-10-09T20:00Z')).id, 1);
  assert.equal(nextCalendarEvent(events, tournaments, Date.parse('2026-10-10T07:00Z')).id, 2);
  assert.equal(nextCalendarEvent(events, tournaments, Date.parse('2026-10-10T09:00Z')).id, 3);
  assert.equal(nextCalendarEvent(events, tournaments, Date.parse('2026-10-11T07:00Z')), null);
  const unknown = { id: 'unimported', start: '2026-10-09', city: 'Paris', competitionIds: [] };
  assert.equal(nextCalendarEvent([...events, unknown], tournaments, Date.parse('2026-10-09T20:00Z')).id, 'unimported');
  assert.equal(nextCalendarEvent([unknown], tournaments, Date.parse('2026-10-09T20:00Z')).startsAt, null);
});
