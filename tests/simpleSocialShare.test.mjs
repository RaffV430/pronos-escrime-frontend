import test from 'node:test';
import assert from 'node:assert/strict';
import { shareSocialCard } from '../src/lib/challengeCard.js';
const file = { name: 'fiction.png' },
  summary = { title: 'Défi', text: 'Exemple fictif', url: 'https://www.pronos-escrime.fr/?match=7' };
test('un seul partage prépare image et lien sans copier ni choisir la destination', async () => {
  const sent = [];
  assert.equal(
    await shareSocialCard(file, summary, { canShare: () => true, share: async (p) => sent.push(p) }),
    'shared',
  );
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].files, [file]);
  assert.ok(sent[0].text.includes(summary.url));
});
test('si le texte est refusé, préserver le partage de l’image seule', async () => {
  const sent = [];
  await shareSocialCard(file, summary, {
    canShare: () => true,
    share: async (p) => {
      sent.push(p);
      if (p.text) throw new TypeError('Text rejected');
    },
  });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[1].files, [file]);
  assert.equal(sent[1].text, undefined);
});
test('une annulation ne relance pas le menu, un navigateur sans fichiers propose le téléchargement', async () => {
  let calls = 0;
  const error = Object.assign(new Error('Annulé'), { name: 'AbortError' });
  await assert.rejects(
    shareSocialCard(file, summary, {
      canShare: () => true,
      share: async () => {
        calls++;
        throw error;
      },
    }),
    { name: 'AbortError' },
  );
  assert.equal(calls, 1);
  assert.equal(await shareSocialCard(file, summary, {}), 'download');
  assert.equal(
    await shareSocialCard(file, summary, {
      canShare: () => false,
      share: () => {
        throw Error('Unexpected');
      },
    }),
    'download',
  );
});
