import test from 'node:test';
import assert from 'node:assert/strict';
import { focusBlockedMatch } from '../src/components/focusBlockedMatch.js';

function fixture(inputs = []) {
  const calls = [];
  const card = {
    querySelectorAll: () => inputs,
    scrollIntoView: () => calls.push('scroll'),
    focus: () => calls.push('card'),
  };
  const doc = {
    body: {},
    getElementById: (id) => {
      calls.push(id);
      return card;
    },
  };
  return { calls, card, doc };
}
test('opens the tree detail and focuses the missing score', () => {
  const f = fixture([
    { value: '15', disabled: false, focus: () => f.calls.push('first') },
    { value: '', disabled: false, focus: () => f.calls.push('second') },
  ]);
  focusBlockedMatch(f.doc, 42, true)();
  assert.deepEqual(f.calls, ['match-detail-42', 'scroll', 'second']);
});
test('invalid completed score focuses the first editable input', () => {
  const f = fixture([{ value: '99', focus: () => f.calls.push('score') }]);
  focusBlockedMatch(f.doc, 7, false)();
  assert.deepEqual(f.calls, ['match-7', 'scroll', 'score']);
});
test('closed match focuses the card without enabling its inputs', () => {
  const f = fixture([{ disabled: true, focus: () => assert.fail('closed input') }]);
  focusBlockedMatch(f.doc, 7, false)();
  assert.equal(f.calls.at(-1), 'card');
});
test('waits for a hidden round to mount and disconnects afterwards', () => {
  const previous = globalThis.MutationObserver;
  let callback,
    disconnected = false;
  globalThis.MutationObserver = class {
    constructor(fn) {
      callback = fn;
    }
    observe() {}
    disconnect() {
      disconnected = true;
    }
  };
  try {
    const f = fixture();
    let mounted = false;
    f.doc.getElementById = () => (mounted ? f.card : null);
    const cleanup = focusBlockedMatch(f.doc, 7, true);
    assert.equal(f.calls.length, 0);
    mounted = true;
    callback();
    assert.equal(f.calls.at(-1), 'card');
    assert.equal(disconnected, true);
    cleanup();
  } finally {
    globalThis.MutationObserver = previous;
  }
});
