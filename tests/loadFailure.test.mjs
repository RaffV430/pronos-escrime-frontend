import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isModuleLoadFailure } from '../src/lib/loadFailure.js';
test('module load errors require a page reload, ordinary render and API errors retain retry', () => {
  for (const message of [
    'Failed to fetch dynamically imported module: /assets/Admin-old.js',
    'Importing a module script failed.',
    'error loading dynamically imported module',
    'Loading chunk 12 failed.',
    'Unable to preload CSS for /assets/app.css',
  ])
    assert.equal(isModuleLoadFailure(message), true);
  for (const message of ['Cannot read properties of undefined', 'Request failed with status code 503', null])
    assert.equal(isModuleLoadFailure(message), false);
});
