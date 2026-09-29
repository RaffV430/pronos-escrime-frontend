import test from 'node:test';
import assert from 'node:assert/strict';
import { entryScript, newerVersion } from '../src/lib/version.js';

const page = (hash) =>
  `<!doctype html><html><head><script type="module" crossorigin src="/assets/index-${hash}.js"></script></head></html>`;
const fetcher =
  (html, ok = true) =>
  async (url, options) => {
    assert.match(url, /^\/\?version-check=\d+$/);
    assert.equal(options.cache, 'no-store');
    return { ok, text: async () => html };
  };

test('reads the hashed entry script of a Vite page', () => {
  assert.equal(entryScript(page('Pgbo7RLO')), '/assets/index-Pgbo7RLO.js');
  assert.equal(entryScript('<html></html>'), null);
});

test('reports a newer version only when the published entry differs', async () => {
  const current = '/assets/index-Pgbo7RLO.js';
  assert.equal(await newerVersion(current, fetcher(page('Pgbo7RLO'))), false);
  assert.equal(await newerVersion(current, fetcher(page('Zx9_ab12'))), true);
  // Page inattendue (erreur, page hors ligne) : aucune alerte.
  assert.equal(await newerVersion(current, fetcher('<p>Hors ligne</p>')), false);
  assert.equal(await newerVersion(current, fetcher(page('Zx9_ab12'), false)), false);
  assert.equal(await newerVersion(null, fetcher(page('Zx9_ab12'))), false);
});
