import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonCurve } from '../src/lib/uxFeatures.js';
import { seasonStory, seasonStoryChart, renderSeasonStory } from '../src/lib/seasonStory.js';
test('la carte utilise la même étape et les mêmes chiffres que la courbe de saison sans modifier les données', () => {
  const tournaments = [
    { id: 2, name: 'Étape B', date: '2026-10-02', points: 40 },
    { id: 1, name: 'Étape A', date: '2026-10-01', points: 100 },
    { id: 3, name: 'Future', date: '2026-10-03', points: 300 },
  ];
  const before = structuredClone(tournaments),
    rows = seasonCurve(tournaments);
  const s = seasonStory(rows, 2, 'Joueur fictif', '2026–2027');
  assert.equal(s.total, 140);
  assert.equal(s.gain, 40);
  assert.deepEqual(s.values, [0, 100, 140]);
  assert.equal(s.event, 'Étape B');
  assert.equal(s.playerName, 'Joueur fictif');
  assert.equal(s.url, 'https://www.pronos-escrime.fr/');
  assert.equal(s.text.includes('Future'), false);
  assert.deepEqual(tournaments, before);
  assert.throws(() => seasonStory(rows, 99), /indisponible/);
});
test('zéro, corrections négatives et grandes valeurs ne fabriquent pas une hausse', () => {
  const s = seasonStory(
    [
      { id: 1, name: 'A', points: 0, cumulative: 0 },
      { id: 2, name: 'B', points: -20, cumulative: -20 },
    ],
    2,
  );
  assert.equal(s.gain, -20);
  assert.match(s.text, /-20 sur ce tournoi/);
  assert.equal(s.text.includes('+-20'), false);
  for (const values of [
    [0, 0],
    [0, -20],
    [0, 1000000],
    [0, 120, 90],
  ])
    for (const [x, y] of seasonStoryChart(values)) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
      assert.ok(y >= 1210 && y <= 1355);
    }
});
test('export story vertical réel avec total et gain fournis, variante de lien adaptée', async () => {
  const seen = [];
  const canvas = {
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop() {} }),
      fillRect() {},
      drawImage() {},
      strokeRect() {},
      beginPath() {},
      lineTo() {},
      moveTo() {},
      stroke() {},
      arc() {},
      fill() {},
      setLineDash() {},
      measureText: (s) => ({ width: String(s).length * 10 }),
      fillText: (s) => seen.push(s),
    }),
    toBlob: (cb) => cb(new Blob(['demo'], { type: 'image/png' })),
  };
  const oldDocument = globalThis.document,
    oldImage = globalThis.Image;
  globalThis.document = { createElement: () => canvas, fonts: { load: async () => [] } };
  globalThis.Image = class {
    async decode() {}
  };
  const s = seasonStory(
      [{ id: 1, name: 'Tournoi fictif très long', points: 42, cumulative: 1765 }],
      1,
      'Fictif',
      '2026–2027',
    ),
    before = structuredClone(s);
  try {
    await renderSeasonStory(s);
    assert.equal(canvas.width, 1080);
    assert.equal(canvas.height, 1920);
    assert.ok(seen.includes((1765).toLocaleString('fr-FR')));
    assert.ok(seen.includes('+42 pts · Tournoi fictif très long'));
    assert.ok(seen.includes('ESPACE POUR TON STICKER LIEN'));
    seen.length = 0;
    await renderSeasonStory(s, 'whatsapp');
    assert.ok(seen.includes('LE LIEN EST DANS LE MESSAGE ↓'));
    assert.deepEqual(s, before);
  } finally {
    globalThis.document = oldDocument;
    globalThis.Image = oldImage;
  }
});
