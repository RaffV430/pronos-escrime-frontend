import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationFromPath, invitationUrl } from '../src/lib/invitation.js';
import { rewriteMedia } from '../src/lib/theme.js';

test('lien d’invitation : code de 24 caractères hexadécimaux, en majuscules', () => {
  const code = 'A1B2C3D4E5F60718293A4B5C';
  assert.equal(invitationFromPath(`/rejoindre/${code.toLowerCase()}`), code);
  assert.equal(invitationFromPath(`/rejoindre/${code}/`), code);
  assert.equal(invitationFromPath('/rejoindre/ABC'), null);
  assert.equal(invitationFromPath('/communaute'), null);
  assert.equal(invitationUrl(code, 'https://www.pronos-escrime.fr'), `https://www.pronos-escrime.fr/rejoindre/${code}`);
});

test('apparence : conditions sombres forcées, neutralisées ou laissées au téléphone', () => {
  const dark = '(prefers-color-scheme: dark)';
  assert.equal(rewriteMedia(dark, 'auto'), dark);
  assert.equal(rewriteMedia(dark, 'dark'), '(min-width: 0px)');
  assert.equal(rewriteMedia(dark, 'light'), '(max-width: 0px)');
  assert.equal(rewriteMedia('(prefers-color-scheme: light)', 'dark'), '(max-width: 0px)');
  assert.equal(
    rewriteMedia('(max-width: 600px) and (prefers-color-scheme: dark)', 'dark'),
    '(max-width: 600px) and (min-width: 0px)',
  );
});

import { calendarDates, calendarCategories, calendarFormat } from '../src/lib/calendar.js';
test('calendrier : dates, catégories et format lisibles', () => {
  assert.equal(calendarDates('2026-10-17', '2026-10-18'), '17–18 oct.');
  assert.equal(calendarDates('2026-10-10', '2026-10-10'), '10 oct.');
  assert.equal(calendarDates('2027-01-30', '2027-02-01'), '30 janv. – 1 févr.');
  assert.deepEqual(calendarCategories(['SENIOR', 'V1', 'V2']), ['Seniors', 'Vétérans']);
  assert.equal(calendarFormat('BOTH'), 'Individuel et équipes');
});
