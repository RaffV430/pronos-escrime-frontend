import test from 'node:test';
import assert from 'node:assert/strict';
import { nav2On, nav2Active, setNav2, NAV2_TABS } from '../src/lib/nav2.js';
import { readNav, NAV2_CATALOG, NAV2_KEY } from '../src/lib/navPrefs.js';
const store = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};
test('navigation par défaut, retour temporaire et URL prioritaire sans stockage', () => {
  globalThis.localStorage = store();
  globalThis.location = {
    search: '',
    href: 'https://example.test/pronos?event=23#poules',
    replace: (v) => {
      globalThis.destination = v;
    },
  };
  assert.equal(nav2On(), true);
  location.search = '?nav=1';
  assert.equal(nav2On(), false);
  location.search = '';
  assert.equal(nav2On(), false);
  location.search = '?nav=2';
  assert.equal(nav2On(), true);
  setNav2(false);
  assert.match(globalThis.destination, /event=23&nav=1#poules/);
  globalThis.localStorage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  location.search = '?nav=1';
  assert.equal(nav2On(), false);
  location.search = '';
  assert.equal(nav2On(), true);
});
test('barre existante migrée sans écraser une préférence nouvelle, ordre et valeurs par défaut', () => {
  globalThis.localStorage = store();
  assert.deepEqual(readNav(NAV2_TABS, NAV2_CATALOG, NAV2_KEY), NAV2_TABS);
  localStorage.setItem('pronos:nav-tabs', JSON.stringify(['home', 'community', 'play']));
  assert.deepEqual(readNav(NAV2_TABS, NAV2_CATALOG, NAV2_KEY), ['home', 'community', 'play']);
  localStorage.setItem(NAV2_KEY, JSON.stringify(['home', 'hub', 'live']));
  assert.deepEqual(readNav(NAV2_TABS, NAV2_CATALOG, NAV2_KEY), ['home', 'hub', 'live']);
  assert.equal(nav2Active('results'), 'live');
  assert.equal(nav2Active('account'), 'hub');
  assert.equal(nav2Active('me'), 'me');
});
test('rechargement interdit pendant saisie ou sans stockage ; confirmation manuelle et garde de session', async () => {
  const { setReloadBlocked, reloadOnceForNewVersion, requestPageReload } = await import('../src/lib/chunkReload.js');
  let count = 0;
  globalThis.window = {
    location: {
      reload() {
        count++;
      },
    },
    confirm: () => false,
  };
  globalThis.sessionStorage = store();
  setReloadBlocked(true);
  assert.equal(reloadOnceForNewVersion(), false);
  assert.equal(requestPageReload(), false);
  assert.equal(count, 0);
  setReloadBlocked(false);
  globalThis.sessionStorage = {
    getItem() {
      throw Error();
    },
  };
  assert.equal(reloadOnceForNewVersion(), false);
  assert.equal(count, 0);
  globalThis.sessionStorage = store();
  assert.equal(reloadOnceForNewVersion(), false);
  const clean = await import('../src/lib/chunkReload.js?clean-session');
  assert.equal(clean.reloadOnceForNewVersion(), true);
  assert.equal(clean.reloadOnceForNewVersion(), false);
  assert.equal(count, 1);
});
