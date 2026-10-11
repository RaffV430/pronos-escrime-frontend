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
