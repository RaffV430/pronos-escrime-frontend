import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveConnections } from '../src/lib/liveConnection.js';
test('une connexion pour plusieurs vues, masquage, reconnexion et arrêt du dernier abonné', () => {
  const sources = [],
    handlers = new Map();
  class Source {
    constructor(url) {
      this.url = url;
      sources.push(this);
    }
    close() {
      this.closed = true;
    }
  }
  const doc = {
    hidden: false,
    addEventListener: (k, f) => handlers.set(k, f),
    removeEventListener: (k) => handlers.delete(k),
  };
  const subscribe = createLiveConnections({
    eventSource: Source,
    get: () => assert.fail('pas de polling en parallèle'),
    baseURL: '/api',
    document: doc,
  });
  let a, b;
  const offA = subscribe(20, (x) => (a = x));
  const offB = subscribe(20, (x) => (b = x));
  assert.equal(sources.length, 1);
  sources[0].onmessage({
    data: JSON.stringify({ version: 1, reset: true, matches: [{ matchId: 1, score1: 3 }], removed: [] }),
  });
  assert.equal(a, b);
  assert.equal(a.get(1).score1, 3);
  offA();
  assert.equal(sources[0].closed, undefined);
  doc.hidden = true;
  handlers.get('visibilitychange')();
  assert.equal(sources[0].closed, true);
  doc.hidden = false;
  handlers.get('visibilitychange')();
  assert.equal(sources.length, 2);
  sources[1].onmessage({ data: JSON.stringify({ version: 1, reset: true, matches: [], removed: [] }) });
  assert.equal(b.size, 0);
  offB();
  assert.equal(sources[1].closed, true);
  assert.equal(handlers.size, 0);
});
