import test from 'node:test';
import assert from 'node:assert/strict';
import { createFieldCache, accountScope, cachePath, cacheLifetime } from '../src/lib/fieldCache.js';
import { fieldAdapter } from '../src/lib/fieldAdapter.js';
import { isFollowedFencer } from '../src/lib/fencerFollows.js';
function storage() {
  const rows = new Map();
  return {
    get length() {
      return rows.size;
    },
    key: (i) => [...rows.keys()][i],
    getItem: (k) => rows.get(k) ?? null,
    setItem: (k, v) => rows.set(k, v),
    removeItem: (k) => rows.delete(k),
  };
}
const token = (id) => `x.${btoa(JSON.stringify({ userId: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.x`;
const config = { url: '/matches', params: { competitionId: 14 }, method: 'get', headers: {}, timeout: 20000 };
const tick = () => new Promise((resolve) => setImmediate(resolve));
test('cache persists only in its account, expires and tolerates unavailable storage', () => {
  const s = storage();
  let now = 0;
  const cache = createFieldCache(s, () => now);
  cache.write('1', '/matches', [{ id: 3 }]);
  assert.equal(createFieldCache(s, () => now).read('1', '/matches').data[0].id, 3);
  assert.equal(cache.read('6', '/matches'), null);
  now = 86400001;
  assert.equal(cache.read('1', '/matches'), null);
  assert.doesNotThrow(() =>
    createFieldCache({
      get length() {
        throw Error();
      },
    }).write('1', 'x', []),
  );
});
test('expired or malformed tokens never enable a private cache', () => {
  assert.equal(accountScope(token(6)), '6');
  assert.equal(accountScope('bad'), null);
  assert.equal(accountScope(`x.${btoa(JSON.stringify({ userId: 1, exp: 1 }))}.x`), null);
  assert.equal(cacheLifetime('/admin'), null);
  assert.equal(cacheLifetime('/auth/me'), 0);
  assert.equal(cachePath({ url: '/matches?competitionId=14' }), cachePath(config));
});
test('reopening displays stored results immediately and revalidates without an unchanged payload', async () => {
  const cache = createFieldCache(storage(), () => Date.now() - 100000);
  cache.write('1', cachePath(config), [{ id: 3 }], 'W/"v1"');
  let calls = 0;
  let sent;
  const adapter = fieldAdapter(
    async (c) => {
      calls++;
      sent = c;
      return { status: 304, headers: { etag: 'W/"v1"' }, config: c };
    },
    cache,
    { token: () => token(1), reduced: () => true, notify: () => {} },
  );
  const r = await adapter(config);
  assert.equal(r.fromCache, true);
  assert.equal(r.data[0].id, 3);
  await tick();
  assert.equal(calls, 1);
  assert.equal(sent.headers['If-None-Match'], 'W/"v1"');
  assert.equal(sent.validateStatus(304), true);
  assert.equal(cache.read('1', cachePath(config)).data[0].id, 3);
});
test('fresh cache avoids duplicate downloads; mutations invalidate it only after server success', async () => {
  const cache = createFieldCache(storage());
  cache.write('1', cachePath(config), []);
  let calls = 0;
  const adapter = fieldAdapter(
    async (c) => {
      calls++;
      return { status: 200, data: [], headers: {}, config: c };
    },
    cache,
    { token: () => token(1), reduced: () => false, notify: () => {} },
  );
  await adapter(config);
  await adapter(config);
  assert.equal(calls, 0);
  await adapter({ ...config, method: 'put' });
  assert.equal(calls, 1);
  assert.equal(cache.read('1', cachePath(config)), null);
});
test('network failure keeps results but 401 removes the copy and notifies expiry', async () => {
  for (const status of [undefined, 401]) {
    const cache = createFieldCache(storage(), () => Date.now() - 100000);
    cache.write('1', cachePath(config), [{ id: 3 }]);
    const notifications = [];
    const error = { response: status ? { status } : undefined };
    const adapter = fieldAdapter(
      async () => {
        throw error;
      },
      cache,
      { token: () => token(1), reduced: () => false, notify: (n) => notifications.push(n) },
    );
    assert.equal((await adapter(config)).data[0].id, 3);
    await tick();
    assert.equal(Boolean(cache.read('1', cachePath(config))), status !== 401);
    assert.equal(status ? notifications[0].error : notifications[0].offline, status ? error : true);
  }
});
test('background requests cannot refill cache after a mutation or account change', async () => {
  const cache = createFieldCache(storage(), () => Date.now() - 100000);
  cache.write('1', cachePath(config), []);
  let finish;
  let active = token(1);
  const adapter = fieldAdapter(
    (c) =>
      c.method === 'put'
        ? Promise.resolve({ status: 200 })
        : new Promise((resolve) => {
            finish = resolve;
          }),
    cache,
    { token: () => active, reduced: () => false, notify: () => {} },
  );
  await adapter(config);
  await adapter({ ...config, method: 'put' });
  active = token(6);
  finish({ status: 200, data: [{ id: 99 }], headers: {} });
  await tick();
  assert.equal(cache.read('1', cachePath(config)), null);
  assert.equal(cache.read('6', cachePath(config)), null);
});
test('stars only use server-approved names, including whitespace/case variations', () => {
  assert.equal(isFollowedFencer({ ready: true, matchNames: ['DIARRA Hayden'] }, 'DIARRA  Hayden'), true);
  assert.equal(
    isFollowedFencer({ ready: true, matchNames: [], favorites: [{ name: 'DIARRA Hayden' }] }, 'DIARRA Hayden'),
    false,
  );
  assert.equal(isFollowedFencer({ ready: false, matchNames: ['DIARRA Hayden'] }, 'DIARRA Hayden'), false);
});
test('cached identity does not retain email or grant administration and rechecks full identity', async () => {
  const cache = createFieldCache(storage());
  const adapter = fieldAdapter(
    async (c) => ({
      status: 200,
      headers: { etag: 'v1' },
      config: c,
      data: {
        id: 1,
        name: 'Raff',
        username: 'Raff',
        email: 'private@example.invalid',
        isAdmin: true,
        twoFactorEnabled: true,
      },
    }),
    cache,
    { token: () => token(1), reduced: () => false, notify: () => {} },
  );
  await adapter({ url: '/auth/me', method: 'get', headers: {} });
  const stored = cache.read('1', '/auth/me').data;
  assert.equal(stored.email, undefined);
  assert.equal(stored.isAdmin, undefined);
  const response = await adapter({ url: '/auth/me', method: 'get', headers: {} });
  assert.equal(response.data.isAdmin, false);
  await tick();
});
test('explicit refresh bypasses a fresh copy; failed writes keep the saved copy', async () => {
  const cache = createFieldCache(storage());
  cache.write('1', cachePath(config), [{ id: 1 }]);
  let calls = 0;
  const adapter = fieldAdapter(
    async (c) => {
      calls++;
      if (c.method === 'put') throw Error('offline');
      return { status: 200, headers: {}, data: [{ id: 2 }], config: c };
    },
    cache,
    { token: () => token(1), reduced: () => false, notify: () => {} },
  );
  assert.equal((await adapter({ ...config, forceRefresh: true })).data[0].id, 2);
  assert.equal(calls, 1);
  await assert.rejects(adapter({ ...config, method: 'put' }));
  assert.equal(cache.read('1', cachePath(config)).data[0].id, 2);
});

test('a server revision revalidates cached results immediately without discarding the readable copy', async () => {
  const cache = createFieldCache(storage());
  cache.write('1', cachePath(config), [{ id: 3, score1: 5 }], 'v1');
  cache.write('6', cachePath(config), [{ id: 99 }]);
  cache.invalidateCompetition('1', 14);
  assert.equal(cache.read('1', cachePath(config)).data[0].score1, 5);
  assert.equal(cache.read('6', cachePath(config)).invalidated, undefined);
  let calls = 0;
  const notifications = [];
  const adapter = fieldAdapter(
    async () => {
      calls++;
      return { status: 200, data: [{ id: 3, score1: 9 }], headers: { etag: 'v2' } };
    },
    cache,
    { token: () => token(1), reduced: () => true, notify: (n) => notifications.push(n) },
  );
  assert.equal((await adapter(config)).data[0].score1, 5);
  await tick();
  assert.equal(calls, 1);
  assert.equal(cache.read('1', cachePath(config)).data[0].score1, 9);
  assert.equal(notifications[0].path, cachePath(config));
});
test('unchanged results do not trigger another screen refresh', async () => {
  const cache = createFieldCache(storage());
  cache.write('1', cachePath(config), [{ id: 3 }], 'v1');
  const notifications = [];
  const adapter = fieldAdapter(async () => ({ status: 304, headers: { etag: 'v1' } }), cache, {
    token: () => token(1),
    notify: (n) => notifications.push(n),
  });
  await adapter({ ...config, forceRefresh: true });
  assert.equal(notifications[0].path, undefined);
});

test('a read started before a save is never reused for the refresh after it', async () => {
  const cache = createFieldCache(storage());
  let saved = false;
  let releaseOld;
  const network = async (c) => {
    if ((c.method || 'get') !== 'get') {
      saved = true;
      return { status: 200, data: {}, headers: {}, config: c };
    }
    const snapshot = saved;
    if (!snapshot) await new Promise((resolve) => (releaseOld = resolve));
    return { status: 200, data: { saved: snapshot }, headers: {}, config: c };
  };
  const adapter = fieldAdapter(network, cache, { token: () => token(1), reduced: () => false, notify: () => {} });
  const before = adapter(config);
  await tick();
  await adapter({ url: '/matches/9/predict', method: 'post', headers: {} });
  const after = await adapter(config);
  assert.equal(after.data.saved, true);
  releaseOld();
  assert.equal((await before).data.saved, false);
  assert.equal(cache.read('1', cachePath(config)).data.saved, true);
});

test('raw JSON bodies from the network are parsed before building the cached profile', async () => {
  const s = storage();
  const cache = createFieldCache(s);
  const network = async (c) => ({
    status: 200,
    headers: { etag: 'W/"1"' },
    config: c,
    data:
      c.url === '/auth/me' ? JSON.stringify({ id: 1, name: 'Raff', username: 'Raff', isAdmin: true }) : '[{"id":3}]',
  });
  const adapter = fieldAdapter(network, cache, { token: () => token(1), reduced: () => false, notify: () => {} });
  const first = await adapter({ url: '/auth/me', method: 'get', headers: {} });
  assert.equal(first.data.id, 1);
  const reload = await adapter({ url: '/auth/me', method: 'get', headers: {} });
  assert.equal(reload.fromCache, true);
  assert.equal(reload.data.id, 1);
  await adapter({ ...config });
  assert.equal((await adapter({ ...config })).data[0].id, 3);
  // An old unreadable profile copy is ignored and fetched again.
  s.setItem(
    [...Array(s.length).keys()].map((i) => s.key(i)).find((k) => k.endsWith('/auth/me')),
    JSON.stringify({ at: Date.now(), data: {} }),
  );
  const repaired = await adapter({ url: '/auth/me', method: 'get', headers: {} });
  assert.equal(repaired.fromCache, undefined);
  assert.equal(repaired.data.id, 1);
});
