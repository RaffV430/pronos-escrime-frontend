import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refonteOn } from '../src/lib/refonte.js';

test('nouveau design pour tous : l’ancien choix est effacé et ?refonte=0 n’a plus d’effet', () => {
  const values = new Map([['pronos:refonte', '0']]);
  const previous = { location: globalThis.location, localStorage: globalThis.localStorage };
  try {
    globalThis.localStorage = {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
      removeItem: (k) => values.delete(k),
    };
    globalThis.location = { search: '?refonte=0', href: 'https://example.test/moi' };
    assert.equal(refonteOn(), true);
    assert.equal(values.has('pronos:refonte'), false, 'ancien choix effacé');
    localStorage.getItem = () => {
      throw new Error('stockage bloqué');
    };
    assert.equal(refonteOn(), true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
