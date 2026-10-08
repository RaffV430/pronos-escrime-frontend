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
