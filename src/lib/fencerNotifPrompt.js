// Invitation à activer les notifications « Mes tireurs » après l'ajout d'un tireur suivi.
// Ces deux options sont désactivées par défaut : sans invitation, on suit des tireurs sans jamais être prévenu.
export const FOLLOWED_EVENT = 'pronos:fencer-followed';
export const FOCUS_KEY = 'pronos:notif-focus';
const DISMISS_MS = 30 * 86400000;
const dismissKey = (userId) => `pronos:fencer-notif-prompt:${userId}`;

export const fencerAlertsOn = (preferences) => Boolean(preferences?.fencerEntries && preferences?.fencerResults);

export function promptAllowed(userId, now = Date.now(), storage = localStorage) {
  try {
    return !(Number(storage.getItem(dismissKey(userId))) > now);
  } catch {
    return true;
  }
}

export function dismissPrompt(userId, now = Date.now(), storage = localStorage) {
  try {
    storage.setItem(dismissKey(userId), String(now + DISMISS_MS));
  } catch {
    /* rappel possible au prochain ajout */
  }
}
