import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createLiveWireDecoder } from '../src/lib/liveWire.js';
import { createLiveConnections } from '../src/lib/liveConnection.js';
const tick = () => new Promise((resolve) => setImmediate(resolve));
const packet = (score = 1) => ({ version: 1, reset: true, matches: [{ matchId: 1, score1: score }], removed: [] });
function setup(decodeWire) {
  const sources = [],
    timers = [];
  class Source {
    constructor(url) {
      this.url = url;
      sources.push(this);
    }
    close() {
      this.closed = true;
    }
  }
  const document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  const subscribe = createLiveConnections({
    eventSource: Source,
    get: () => assert.fail('pas de polling'),
    baseURL: '/api',
    document,
    decodeWire,
    setTimer: (fn) => {
      timers.push(fn);
      return fn;
    },
    clearTimer() {},
  });
  let scores;
  const off = subscribe(20, (value) => {
    scores = value;
  });
  return { sources, timers, off, scores: () => scores };
}
test('codec : gzip/base64 Unicode, JSON ancien, formats invalides et taille décompressée bornée', async () => {
  const decode = createLiveWireDecoder();
  assert.ok(decode);
  const value = { ...packet(), label: 'Synthétique é🤺' };
  assert.deepEqual(
    await decode({ wire: 'gzip-base64-v1', data: gzipSync(JSON.stringify(value)).toString('base64') }),
    value,
  );
  assert.deepEqual(await decode(value), value);
  for (const bad of [
    { wire: 'unknown', data: '' },
    { wire: 'gzip-base64-v1', data: '!!!!' },
    { wire: 'gzip-base64-v1', data: 'AAAA' },
  ])
    await assert.rejects(decode(bad));
  await assert.rejects(
    decode({ wire: 'gzip-base64-v1', data: gzipSync(' '.repeat(8 * 1024 * 1024 + 1)).toString('base64') }),
    /volumineux/,
  );
});
test('décompression asynchrone : ordre conservé, résultat en vol ignoré après fermeture', async () => {
  let release;
  const state = setup(async (value) => {
    if (value.matches[0].score1 === 1)
      await new Promise((resolve) => {
        release = resolve;
      });
    return value;
  });
  assert.match(state.sources[0].url, /wire=gzip-base64-v1/);
  state.sources[0].onmessage({ data: JSON.stringify(packet(1)) });
  state.sources[0].onmessage({
    data: JSON.stringify({ version: 1, reset: false, matches: [{ matchId: 1, score1: 2 }], removed: [] }),
  });
  await tick();
  assert.equal(state.scores().size, 0);
  release();
  await tick();
  await tick();
  assert.equal(state.scores().get(1).score1, 2);
  state.off();
  const late = setup(async (value) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    return value;
  });
  late.sources[0].onmessage({ data: JSON.stringify(packet()) });
  await tick();
  late.off();
  release();
  await tick();
  assert.equal(late.scores().size, 0);
});
test('message défectueux : reprise automatique sur SSE classique ; ancien serveur et navigateur restent compatibles', async () => {
  const state = setup(async () => {
    throw new Error('gzip invalide');
  });
  state.sources[0].onmessage({ data: '{}' });
  await tick();
  assert.equal(state.sources[0].closed, true);
  state.timers.shift()();
  assert.ok(!state.sources[1].url.includes('wire='));
  state.sources[1].onmessage({ data: JSON.stringify(packet(3)) });
  assert.equal(state.scores().get(1).score1, 3);
  state.off();
  const old = setup(null);
  assert.ok(!old.sources[0].url.includes('wire='));
  old.sources[0].onmessage({ data: JSON.stringify(packet(4)) });
  assert.equal(old.scores().get(1).score1, 4);
  old.off();
  const modern = setup(createLiveWireDecoder());
  modern.sources[0].onmessage({ data: JSON.stringify(packet(5)) });
  await tick();
  await tick();
  assert.equal(modern.scores().get(1).score1, 5);
  modern.off();
});
test('file de décompression bornée : un client dépassé reprend un instantané classique', async () => {
  let release;
  const state = setup(async (value) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    return value;
  });
  state.sources[0].onmessage({ data: JSON.stringify(packet()) });
  await tick();
  for (let i = 0; i < 20; i++) state.sources[0].onmessage({ data: JSON.stringify(packet(i)) });
  assert.equal(state.sources[0].closed, true);
  state.timers.shift()();
  release();
  await tick();
  await tick();
  state.sources[1].onmessage({ data: JSON.stringify(packet(9)) });
  assert.equal(state.scores().get(1).score1, 9);
  state.off();
});
