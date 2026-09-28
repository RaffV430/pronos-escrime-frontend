import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAuthError, SESSION_EXPIRED_EVENT } from '../src/lib/session.js';

const error = (status, url = '/matches', token = true) => ({
  response: { status },
  config: { url, headers: token ? { Authorization: 'Bearer x' } : {} },
});
const env = () => {
  const removed = [],
    events = [];
  return {
    removed,
    events,
    storage: { removeItem: (k) => removed.push(k) },
    target: { dispatchEvent: (e) => events.push(e.type) },
  };
};

test('an expired token is cleared and the app is told to show the login screen', async () => {
  const e = env();
  await assert.rejects(handleAuthError(error(401), e));
  assert.deepEqual(e.removed, ['token']);
  assert.deepEqual(e.events, [SESSION_EXPIRED_EVENT]);
});

test('wrong passwords, forbidden pages, anonymous calls and server errors keep the session', async () => {
  for (const err of [
    error(401, '/auth/login'),
    error(401, '/auth/register'),
    error(403),
    error(401, '/matches', false),
    error(500),
    { message: 'Network Error' },
  ]) {
    const e = env();
    await assert.rejects(handleAuthError(err, e));
    assert.deepEqual([e.removed, e.events], [[], []]);
  }
});
