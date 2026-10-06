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
