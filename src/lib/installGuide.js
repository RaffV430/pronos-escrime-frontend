export const INSTALL_REMINDER_KEY = 'pronos:install-reminder:v2';
export const INSTALL_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export function installationGuide({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  const ios = /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const embedded = /FBAN|FBAV|Instagram|; wv\)|\bwv\b|Line\//i.test(userAgent);
  if (ios)
    return {
      device: 'ios',
      title: 'Sur votre iPhone ou iPad',
      intro: embedded
        ? 'Ouvrez d’abord ce site dans Safari depuis le menu de ce navigateur.'
        : 'Dans Safari, ajoutez Pronos Escrime à votre écran d’accueil.',
      steps: [
        'Touchez Partager (carré avec une flèche vers le haut). Selon Safari, ouvrez d’abord le menu « … ».',
        'Choisissez « Sur l’écran d’accueil ». Si cette option manque, cherchez « Modifier les actions ».',
        'Si « Ouvrir comme app web » apparaît, laissez-le activé, puis touchez « Ajouter ».',
      ],
      extra: 'Si votre navigateur ne propose pas cette option, ouvrez ce site dans Safari.',
    };
  if (/Android/i.test(userAgent))
    return {
      device: 'android',
      title: 'Sur votre téléphone Android',
      intro: embedded
        ? 'Ouvrez d’abord ce site dans Chrome depuis le menu de ce navigateur.'
        : 'Ajoutez Pronos Escrime depuis le menu de Chrome.',
      steps: [
        'Touchez le menu ⋮ du navigateur.',
        'Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil » (parfois dans « Installer et créer un raccourci »).',
        'Confirmez « Installer » ou « Ajouter ».',
      ],
      extra: 'Le libellé peut varier selon le navigateur. Si l’option manque, essayez dans Chrome.',
    };
  return {
    device: 'desktop',
    title: 'Installer Pronos Escrime',
    intro: 'Retrouvez Pronos Escrime comme une application.',
    steps: [
      'Ouvrez le menu du navigateur.',
      'Cherchez « Installer l’application » ou l’icône d’installation dans la barre d’adresse.',
    ],
    extra: 'Cette option dépend du navigateur. Sur téléphone, les étapes sont adaptées automatiquement.',
  };
}
export function installationInstalled({ standalone = false, displayMode = false } = {}) {
  return Boolean(standalone || displayMode);
}
export function maySuggestInstallation({ device, installed, hidden = false, snoozedUntil = 0, now = Date.now() }) {
  return device !== 'desktop' && !installed && !hidden && Number(snoozedUntil) <= now;
}
