import test from 'node:test';
import assert from 'node:assert/strict';
import { legalPageFor } from '../src/lib/legal.js';

test('legal pages are reachable by their public paths, with or without trailing slash', () => {
  assert.equal(legalPageFor('/mentions-legales'), 'legal');
  assert.equal(legalPageFor('/confidentialite/'), 'privacy');
  assert.equal(legalPageFor('/'), null);
  assert.equal(legalPageFor('/confidentialite-x'), null);
});

test('la page des règles est publique et son chemin est exact', () => {
  assert.equal(legalPageFor('/regles-et-charte'), 'rules');
  assert.equal(legalPageFor('/regles-et-charte/'), 'rules');
  assert.equal(legalPageFor('/regles-et-charte-x'), null);
});
