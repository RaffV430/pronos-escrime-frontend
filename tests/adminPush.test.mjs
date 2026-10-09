import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('admin push updates badge and opens exact validation destination without discarding drafts', async () => {
  const handlers = {},
    calls = [];
  const self = {
    location: { origin: 'https://app.test' },
    addEventListener: (name, fn) => (handlers[name] = fn),
    navigator: {
      setAppBadge: async (count) => calls.push(['badge', count]),
      clearAppBadge: async () => calls.push(['clear']),
    },
    registration: { showNotification: async (_, data) => calls.push(['notification', data]) },
    clients: { openWindow: async (url) => calls.push(['open', url]) },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self,
    URL,
    Promise,
    Intl,
  });
  let pending;
  handlers.push({
    data: {
      json: () => ({ title: 'Club à valider', url: '/admin?panel=clubs&request=6', adminAlert: true, badgeCount: 3 }),
    },
    waitUntil: (p) => (pending = p),
  });
  await pending;
  assert.deepEqual(calls[0], ['badge', 3]);
  const notification = calls.find((c) => c[0] === 'notification')[1];
  handlers.notificationclick({
    notification: { data: notification.data, close() {} },
    waitUntil: (p) => (pending = p),
  });
  await pending;
  assert.deepEqual(calls.at(-1), ['open', 'https://app.test/admin?panel=clubs&request=6']);
  handlers.push({
    data: { json: () => ({ title: 'Rétabli', url: '/admin?panel=sync', adminAlert: true, badgeCount: 0 }) },
    waitUntil: (p) => (pending = p),
  });
  await pending;
  assert.ok(calls.some((c) => c[0] === 'clear'));
});
