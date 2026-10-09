import test from 'node:test';
import assert from 'node:assert/strict';
import { adminDestination, adminLoginPath, loginReturn, updateBadge } from '../src/lib/adminDestination.js';
test('club notification destination survives login without an external redirect', () => {
  const path = adminLoginPath('/admin/event-4/foil-14', '?panel=clubs&request=23');
  assert.equal(loginReturn(new URL(path, 'https://example.test').search), '/admin?panel=clubs&request=23');
  assert.deepEqual(adminDestination('?panel=clubs&request=23'), { panel: 'clubs', requestId: 23 });
  for (const value of ['https://evil.test', '//evil.test', '/administer', '/admin#external', '/admin\\evil'])
    assert.equal(loginReturn(`?returnTo=${encodeURIComponent(value)}`), null);
  assert.equal(adminDestination('?panel=unknown'), null);
  assert.deepEqual(adminDestination('?panel=sync&request=-1'), { panel: 'sync', requestId: null });
});
test('badge follows unresolved count, clears at zero, and denied permissions do not block app', async () => {
  const calls = [];
  const target = { setAppBadge: async (n) => calls.push(n), clearAppBadge: async () => calls.push('clear') };
  await updateBadge(3, target);
  await updateBadge(0, target);
  assert.deepEqual(calls, [3, 'clear']);
  await updateBadge(2, {});
  await updateBadge(2, {
    setAppBadge: async () => {
      throw new Error('denied');
    },
  });
});
