import test from 'node:test';
import assert from 'node:assert/strict';
import { searchEvents, searchText } from '../src/lib/searchEvents.js';
test('retrouve une ville du calendrier sans tournoi créé, accents et tirets ignorés', () => {
  const items = searchEvents(
    [],
    [
      {
        id: 'a',
        city: 'Hénin-Beaumont',
        label: 'Épreuve nationale 1',
        weapon: 'Fleuret',
        categories: ['SENIOR'],
        start: '2026-10-17',
      },
    ],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].calendar, true);
  assert.ok(searchText(items[0].searchable).includes(searchText('henin')));
  assert.ok(searchText(items[0].searchable).includes(searchText('henin beaumont')));
});
test('enrichit une épreuve liée au calendrier sans doubler le résultat', () => {
  const event = { id: 10, name: 'Fleuret hommes' };
  const items = searchEvents(
    [{ id: 1, name: 'CN', competitions: [event] }],
    [{ city: 'Hénin-Beaumont', competitionIds: [10] }],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].event, event);
  assert.ok(searchText(items[0].searchable).includes('henin'));
  assert.equal(items[0].calendar, undefined);
});

test('plusieurs événements non créés restent consultables ensemble', () => {
 const rows = searchEvents([], [{id:'a',city:'Hénin-Beaumont'}, {id:'b',city:'Lyon'}]);
 assert.equal(rows.length,2);
});
