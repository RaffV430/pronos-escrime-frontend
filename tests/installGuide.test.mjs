import test from 'node:test';
import assert from 'node:assert/strict';
import {
  installationGuide,
  installationInstalled,
  maySuggestInstallation,
  INSTALL_SNOOZE_MS,
} from '../src/lib/installGuide.js';
test('iPhone and Chrome iOS receive Apple instructions', () => {
  for (const userAgent of ['iPhone Safari', 'iPhone CriOS/130'])
    assert.equal(installationGuide({ userAgent }).device, 'ios');
});
test('iPad desktop mode is recognised', () =>
  assert.equal(installationGuide({ platform: 'MacIntel', maxTouchPoints: 5 }).device, 'ios'));
test('Mac is not mistaken for iPad', () =>
  assert.equal(installationGuide({ platform: 'MacIntel', maxTouchPoints: 0 }).device, 'desktop'));
test('Android receives Chrome steps; embedded browsers get a way out', () => {
  assert.equal(installationGuide({ userAgent: 'Android Chrome' }).device, 'android');
  assert.equal(installationGuide({ userAgent: 'Android Instagram' }).embedded, true);
  assert.equal(installationGuide({ userAgent: 'iPhone FBAN' }).embedded, true);
});
test('installed iOS and standalone are both recognised', () => {
  assert.equal(installationInstalled({ standalone: true }), true);
  assert.equal(installationInstalled({ displayMode: true }), true);
  assert.equal(installationInstalled(), false);
});
test('invitation waits until snooze expires and never shows hidden, installed or desktop', () => {
  const base = { device: 'ios', installed: false, now: 100 };
  assert.equal(maySuggestInstallation(base), true);
  for (const patch of [{ device: 'desktop' }, { installed: true }, { hidden: true }, { snoozedUntil: 101 }])
    assert.equal(maySuggestInstallation({ ...base, ...patch }), false);
  assert.equal(maySuggestInstallation({ ...base, snoozedUntil: 100 }), true);
  assert.equal(INSTALL_SNOOZE_MS, 43200000);
});

test('iOS steps use the share icon without a verbose shape description', () => {
  const guide = installationGuide({ userAgent: 'iPhone Safari' });
  assert.match(guide.steps[0], /Partager/);
  assert.doesNotMatch(guide.steps[0], /carré/);
  assert.equal(guide.steps[1], 'Choisissez « Sur l’écran d’accueil ».');
});

test('embedded iPhone guides leaving the app before installation', () => {
  const guide = installationGuide({ userAgent: 'iPhone Instagram' });
  assert.equal(guide.embedded, true);
  assert.match(guide.steps[2], /copiez/);
  assert.doesNotMatch(guide.steps[0], /Touchez Partager/);
});

test('a twelve-hour dismissal survives visits until the expiry boundary', () => {
  const dismissedAt = Date.UTC(2026, 9, 22, 8);
  const snoozedUntil = dismissedAt + INSTALL_SNOOZE_MS;
  const visit = { device: 'ios', installed: false, snoozedUntil };
  assert.equal(maySuggestInstallation({ ...visit, now: dismissedAt + 11 * 3600000 }), false);
  assert.equal(maySuggestInstallation({ ...visit, now: snoozedUntil - 1 }), false);
  assert.equal(maySuggestInstallation({ ...visit, now: snoozedUntil }), true);
});
