import test from 'node:test';
import assert from 'node:assert/strict';
import { closeOnBackdrop } from '../src/components/dialogBackdrop.js';

function dialog() {
  const d = {
    closed: false,
    close() {
      d.closed = true;
    },
    getBoundingClientRect: () => ({ left: 100, right: 500, top: 100, bottom: 400 }),
  };
  return d;
}
const click = (d, x, y, target = d) => closeOnBackdrop({ currentTarget: d, target, clientX: x, clientY: y });

test('clic à côté de la fenêtre : fermée avec une souris, pas sur écran tactile', () => {
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  let d = dialog();
  click(d, 50, 50);
  assert.equal(d.closed, true);
  d = dialog();
  click(d, 200, 200); // marge intérieure de la fenêtre
  assert.equal(d.closed, false);
  d = dialog();
  click(d, 50, 50, {}); // clic sur un élément du contenu
  assert.equal(d.closed, false);
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  d = dialog();
  click(d, 50, 50);
  assert.equal(d.closed, false);
});
