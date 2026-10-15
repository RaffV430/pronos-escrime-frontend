import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarCategories, filterCalendar } from '../src/lib/calendar.js';
test('U23 distinct de M20 et championnat commun visible par arme sans duplication', () => {
 const rows = [
  { id: 1, weapon: 'Épée', categories: ['U23'], label: 'Internationale 1' },
  { id: 2, weapons: ['Fleuret','Épée','Sabre'], categories: ['M17','M20'], label: 'Championnat du monde' },
  { id: 3, weapon: 'Fleuret', categories: ['SENIOR'], label: 'Championnat de France' },
 ];
 assert.deepEqual(calendarCategories(['U23']), ['U23']);
 assert.deepEqual(filterCalendar(rows, { weapon: 'Épée', category: 'U23' }).map(e=>e.id), [1]);
 assert.deepEqual(filterCalendar(rows, { weapon: 'Sabre', level: 'international' }).map(e=>e.id), [2]);
 assert.deepEqual(filterCalendar(rows, { level: 'national' }).map(e=>e.id), [3]);
 assert.deepEqual(filterCalendar(rows, { category: 'M20' }).map(e=>e.id), [2]);
});
