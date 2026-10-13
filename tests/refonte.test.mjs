import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refonteOn, setRefonte } from '../src/lib/refonte.js';

test('nouveau design par défaut, ancien conservé après navigation, retour possible', () => {
  const values = new Map();
  const previous = { location: globalThis.location, localStorage: globalThis.localStorage };
  try {
    globalThis.localStorage = { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v) };
    globalThis.location = {
      search: '',
      href: 'https://example.test/moi?test=1#fiche',
      replace: (url) => {
        globalThis.location.replaced = url;
      },
    };
    assert.equal(refonteOn(), true);
    setRefonte(false);
    assert.equal(refonteOn(), false);
    assert.equal(location.replaced, '/moi?test=1#fiche');
    setRefonte(true);
    assert.equal(refonteOn(), true);
    location.search = '?refonte=0';
    assert.equal(refonteOn(), false);
    location.search = '';
    assert.equal(refonteOn(), false);
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
