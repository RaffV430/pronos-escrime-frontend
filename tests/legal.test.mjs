import test from 'node:test';
import assert from 'node:assert/strict';
import { legalPageFor } from '../src/lib/legal.js';

test('legal pages are reachable by their public paths, with or without trailing slash', () => {
  assert.equal(legalPageFor('/mentions-legales'), 'legal');
  assert.equal(legalPageFor('/confidentialite/'), 'privacy');
  assert.equal(legalPageFor('/'), null);
  assert.equal(legalPageFor('/confidentialite-x'), null);
});
