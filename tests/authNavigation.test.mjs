import test from 'node:test';
import assert from 'node:assert/strict';
import { authPath, isAuthPath, legacyLoginPath } from '../src/lib/authNavigation.js';
test('connexion et inscription indépendantes, liens de matchs et invitations préservés', () => {
  assert.equal(isAuthPath('/connexion'), true);
  assert.equal(isAuthPath('/inscription/'), true);
  assert.equal(isAuthPath('/connexion/inconnue'), false);
  assert.equal(authPath(false, '?event=14&match=42'), '/connexion?event=14&match=42');
  assert.equal(authPath(true, '?invite=abc'), '/inscription?invite=abc');
});
test('anciens liens de connexion dirigés vers la page dédiée sans perdre le contexte', () => {
  assert.equal(legacyLoginPath('/', '?event=14', '#connexion'), '/connexion?event=14');
  assert.equal(legacyLoginPath('/', '', '#autre'), null);
  assert.equal(legacyLoginPath('/connexion', '', '#connexion'), null);
});
