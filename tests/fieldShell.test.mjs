import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker(shell, network) {
  const handlers = {};
  const saved = [];
  const context = {
    URL,
    fetch: network,
    caches: {
      match: async (p) => (p === '/' ? shell : 'offline'),
      open: async () => ({ match: async () => shell, put: async (key, response) => saved.push([key, response]) }),
    },
    self: { location: { origin: 'https://app.test' }, addEventListener: (kind, fn) => (handlers[kind] = fn) },
  };
  vm.runInNewContext(source, context);
  const invoke = (request) => {
    let response;
    let background;
    handlers.fetch({ request, respondWith: (p) => (response = p), waitUntil: (p) => (background = p) });
    return { response, background };
  };
  return { invoke, saved };
}
test('reopening uses the public shell without waiting for the network', async () => {
  const w = worker('known-shell', () => new Promise(() => {}));
  assert.equal(
    await w.invoke({ url: 'https://app.test/moi', method: 'GET', mode: 'navigate' }).response,
    'known-shell',
  );
});
test('public shell remains available offline and refreshes when connected', async () => {
  const offline = worker(null, async () => {
    throw Error('offline');
  });
  assert.equal(
    await offline.invoke({ url: 'https://app.test/moi', method: 'GET', mode: 'navigate' }).response,
    'offline',
  );
  const fresh = { ok: true, headers: { get: () => 'text/html' }, clone: () => 'fresh-shell' };
  const online = worker('known-shell', async () => fresh);
  const event = online.invoke({ url: 'https://app.test/moi', method: 'GET', mode: 'navigate' });
  assert.equal(await event.response, 'known-shell');
  await event.background;
  assert.equal(online.saved[0][0], '/');
  assert.equal(online.saved[0][1], 'fresh-shell');
});
test('service worker never intercepts private API data or mutations', () => {
  const w = worker('shell', () => {
    throw Error('must not fetch');
  });
  for (const request of [
    { url: 'https://app.test/api/auth/me', method: 'GET', mode: 'cors' },
    { url: 'https://api.test/matches', method: 'GET', mode: 'cors' },
    { url: 'https://app.test/predictions', method: 'POST', mode: 'cors' },
  ])
    assert.equal(w.invoke(request).response, undefined);
});
test('a missing asset answered with the HTML page is never kept in the cache', async () => {
  const asset = { url: 'https://app.test/assets/Old-abc.js', method: 'GET', mode: 'cors' };
  const headers = (type) => ({ get: () => type });
  const html = { ok: true, headers: headers('text/html; charset=utf-8'), clone: () => 'html' };
  const missing = worker(null, async () => html);
  assert.equal(await missing.invoke(asset).response, html);
  assert.equal(missing.saved.length, 0);
  const js = { ok: true, headers: headers('application/javascript'), clone: () => 'js' };
  const found = worker(null, async () => js);
  assert.equal(await found.invoke(asset).response, js);
  assert.equal(found.saved.length, 1);
});
test('the cache version changes so that previously stored HTML assets are purged', () => {
  assert.match(source, /const CACHE = 'pronos-public-v5'/);
});
test('missing assets are real 404s, not the application page', () => {
  const { rewrites } = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(rewrites.at(-1).source, '/((?!assets/).*)');
});
