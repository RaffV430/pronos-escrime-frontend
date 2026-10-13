import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectLanguage } from '../src/i18n/language.js';
import { translate } from '../src/i18n/translate.js';
import fr from '../src/i18n/fr.js';
import en from '../src/i18n/en.js';

test('langue de l’appareil : français si elle commence par « fr », anglais sinon', () => {
  assert.equal(detectLanguage(['fr-FR', 'en-US']), 'fr');
  assert.equal(detectLanguage(['fr-CA']), 'fr');
  assert.equal(detectLanguage(['en-GB', 'fr-FR']), 'en');
  assert.equal(detectLanguage(['it-IT']), 'en');
  assert.equal(detectLanguage([]), 'fr');
});

test('chaque texte français a sa version anglaise (et inversement)', () => {
  const missing = Object.keys(fr).filter((k) => !(k in en));
  const extra = Object.keys(en).filter((k) => !(k in fr));
  assert.deepEqual(missing, [], `Traductions anglaises manquantes : ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `Clés anglaises sans texte français : ${extra.join(', ')}`);
});

test('variables, pluriels et repli sur le français', () => {
  assert.equal(translate('en', 'home.rankOf', { n: 90 }), 'of 90 players');
  assert.equal(translate('fr', 'home.events', { n: 1 }), '1 épreuve');
  assert.equal(translate('en', 'home.events', { n: 3 }), '3 events');
  assert.equal(translate('en', 'home.rank', { rank: 22 }), '22nd');
  assert.equal(translate('en', 'clé.inconnue'), 'clé.inconnue');
});
