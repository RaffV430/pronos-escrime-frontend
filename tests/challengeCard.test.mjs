import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeFor } from '../src/lib/challengeCard.js';
test('le lien de défi ouvre le match sans transmettre les paramètres de session', () => {
  const m = { id: 42, player1: 'ALPHA A', player2: 'BETA B' };
  const c = challengeFor(
    m,
    { predictedScore1: 10, predictedScore2: 8 },
    'http://localhost:5173/pronostiquer/test-1/vet-50-23/tableau?refonte=1&token=fictif&invite=fictif',
    true,
  );
  const url = new URL(c.url);
  assert.equal(url.pathname, '/pronostiquer/test-1/vet-50-23/tableau');
  assert.equal(url.searchParams.get('match'), '42');
  assert.equal(url.searchParams.get('refonte'), '1');
  assert.equal(url.searchParams.has('token'), false);
  assert.equal(url.searchParams.has('invite'), false);
  assert.equal(c.local, true);
  assert.match(c.text, /ALPHA A \(10–8\)/);
});
test('une sélection de vainqueur seul ne prétend pas avoir un score exact', () => {
  const c = challengeFor(
    { id: 1, player1: 'A', player2: 'B' },
    { predictedScore1: 0, predictedScore2: 1, winnerOnly: true },
    'https://www.pronos-escrime.fr/pronostiquer/1/2/tableau',
    true,
  );
  assert.match(c.text, /B vainqueur/);
  assert.equal(c.text.includes('0–1'), false);
  assert.equal(c.local, false);
  assert.match(
    challengeFor({ id: 1, player1: 'A', player2: 'B' }, null, 'http://localhost:5173/pronostiquer/1/2/tableau').text,
    /qui gagne/,
  );
});

test('challenge hides the winner and score unless explicitly requested', () => {
  const c = challengeFor(
    { id: 1, player1: 'A', player2: 'B' },
    { predictedScore1: 10, predictedScore2: 3 },
    'http://localhost:5173/test',
  );
  assert.equal(c.winner, null);
  assert.equal(c.revealPrediction, false);
  assert.equal(c.text, 'A ou B : qui gagne ?');
  assert.equal(new URL(c.url).search, '?match=1');
});

test('WhatsApp joint le lien au texte avec image, Instagram garde une image pour sticker manuel', async () => {
  const { challengeSharePayload } = await import('../src/lib/challengeCard.js');
  const c = challengeFor(
    { id: 9, player1: 'A', player2: 'B' },
    null,
    'https://www.pronos-escrime.fr/pronostiquer/t-1/c-2/tableau?token=secret',
  );
  const file = { name: 'story.png' };
  const whatsapp = challengeSharePayload(c, file, 'whatsapp', true);
  assert.deepEqual(whatsapp.files, [file]);
  assert.match(whatsapp.text, /\?match=9/);
  assert.equal(whatsapp.text.includes('secret'), false);
  const instagram = challengeSharePayload(c, file, 'instagram', true);
  assert.equal(instagram.text, undefined);
  assert.deepEqual(instagram.files, [file]);
  for (const channel of ['instagram', 'whatsapp']) {
    const fallback = challengeSharePayload(c, file, channel, false);
    assert.equal(fallback.files, undefined);
    assert.ok(fallback.text.includes(c.url));
  }
});

test('la story est verticale, ne révèle rien par défaut et ne transforme pas vainqueur seul en score', async () => {
  const { renderChallengeCard } = await import('../src/lib/challengeCard.js');
  const texts = [];
  const canvas = {
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop() {} }),
      fillRect() {},
      drawImage() {},
      beginPath() {},
      roundRect() {},
      fill() {},
      setLineDash() {},
      strokeRect() {},
      measureText: (s) => ({ width: s.length * 20 }),
      fillText: (s) => texts.push(s),
    }),
    toBlob: (cb) => cb(new Blob(['demo'], { type: 'image/png' })),
  };
  const oldDocument = globalThis.document,
    oldImage = globalThis.Image;
  globalThis.document = { createElement: () => canvas, fonts: { load: async () => [] } };
  globalThis.Image = class {
    async decode() {}
  };
  const m = { id: 3, player1: 'ALPHA Fictif', player2: 'BETA Exemple', round: 'T2' };
  const p = { predictedScore1: 14, predictedScore2: 15, pointsEarned: 4 };
  const before = structuredClone(p);
  try {
    await renderChallengeCard(m, p, challengeFor(m, p, 'https://www.pronos-escrime.fr/test'));
    assert.equal(canvas.width, 1080);
    assert.equal(canvas.height, 1920);
    assert.equal(texts.includes('14 – 15'), false);
    assert.ok(texts.includes('ESPACE POUR TON STICKER LIEN'));
    texts.length = 0;
    await renderChallengeCard(m, p, challengeFor(m, p, 'https://www.pronos-escrime.fr/test', true), 'whatsapp');
    assert.ok(texts.includes('14 – 15'));
    assert.ok(texts.includes('LE LIEN EST DANS LE MESSAGE ↓'));
    texts.length = 0;
    const quick = { ...p, winnerOnly: true, predictedScore1: 0, predictedScore2: 1 };
    await renderChallengeCard(m, quick, challengeFor(m, quick, 'https://www.pronos-escrime.fr/test', true));
    assert.equal(texts.includes('0 – 1'), false);
    assert.ok(texts.includes('MON CHOIX'));
    assert.deepEqual(p, before);
  } finally {
    globalThis.document = oldDocument;
    globalThis.Image = oldImage;
  }
});
