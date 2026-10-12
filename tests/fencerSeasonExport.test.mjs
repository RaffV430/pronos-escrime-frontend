import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonRows, seasonCsv } from '../src/lib/fencerSeasonExport.js';

test('season export lists pools, bouts, tableau and final place', () => {
  const data = {
    favorite: { name: 'MARTIN Léa' },
    season: '2026-2027',
    competitions: [
      {
        date: '2026-10-10T09:00:00Z',
        tournament: 'Étampes; CN',
        competition: 'M20',
        pools: [
          {
            pool: 'Poule 3',
            wins: 4,
            losses: 1,
            indicator: 9,
            place: 2,
            size: 6,
            bouts: [{ opponent: 'X', won: true, given: 5, received: 2 }],
          },
        ],
        tableau: [{ round: 'T32', opponent: 'Y', won: false, score: [12, 15] }],
        result: { label: 'Éliminé en T32' },
      },
    ],
  };
  const rows = seasonRows(data);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[2].slice(3, 7), ['Poule 3', 'X', 'V', '5-2']);
  assert.deepEqual(rows[3].slice(3, 7), ['T32', 'Y', 'D', '12-15']);
  const csv = seasonCsv(data);
  assert.ok(csv.startsWith('﻿Date;'));
  assert.ok(csv.includes('"Étampes; CN"'));
});
