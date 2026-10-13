import { isMatchClosed } from '../components/matchPresentation.js';
export const UX_EVENT = 'pronos:ux-settings';
export const UX_SAVE = 'pronos:prediction-saved';
export const uxKey = (id) => `pronos:ux:${id}`;
export function readUx(id, storage = localStorage) {
  try {
    return {
      adapted: false,
      gains: true,
      onStrip: true,
      next: true,
      ...JSON.parse(storage.getItem(uxKey(id)) || '{}'),
    };
  } catch {
    return { adapted: false, gains: true, onStrip: true, next: true };
  }
}
export function writeUx(id, values) {
  const next = { ...readUx(id), ...values };
  try {
    localStorage.setItem(uxKey(id), JSON.stringify(next));
  } catch {
    /* La préférence reste utilisable sans stockage. */
  }
  window.dispatchEvent(new CustomEvent(UX_EVENT, { detail: { id, values: next } }));
  return next;
}
export const PROFILE_KEYS = [
  'fencerResults',
  'fencerEntries',
  'newMatches',
  'reminders',
  'roundResults',
  'poolResults',
  'recap',
];
export function notificationProfile(profile, current) {
  if (profile === 'custom') return current;
  const follow = profile !== 'predict',
    predict = profile !== 'follow';
  return {
    ...current,
    fencerResults: follow,
    fencerEntries: follow,
    newMatches: predict,
    reminders: predict,
    roundResults: predict,
    poolResults: predict,
    recap: predict,
  };
}
export function inferredProfile(p) {
  for (const key of ['follow', 'predict', 'both']) {
    const wanted = notificationProfile(key, {});
    if (PROFILE_KEYS.every((k) => Boolean(p[k]) === wanted[k])) return key;
  }
  return 'custom';
}
export function restoreBody(p) {
  if (!p) return null;
  return p.winnerOnly
    ? { winner: p.predictedScore1 > p.predictedScore2 ? 1 : 2 }
    : { predictedScore1: p.predictedScore1, predictedScore2: p.predictedScore2 };
}
export function canUndoPrediction(match, saved, userId, now) {
  const latest = match?.predictions?.find((p) => p.userId === userId);
  return Boolean(
    match &&
    saved &&
    latest &&
    !isMatchClosed(match, now) &&
    ['predictedScore1', 'predictedScore2', 'winnerOnly'].every((k) => latest[k] === saved[k]),
  );
}
export function seasonCurve(tournaments = []) {
  let points = 0;
  return [...tournaments]
    .filter((t) => Number.isFinite(t.points))
    .sort((a, b) => Date.parse(a.date || '') - Date.parse(b.date || '') || a.id - b.id)
    .map((t) => ({ ...t, cumulative: (points += t.points) }));
}
export function nextOpponent(match, name) {
  if (!match || match.isFinished || ![match.player1, match.player2].includes(name)) return null;
  return match.player1 === name ? match.player2 : match.player1;
}
// Seulement une présentation des composantes déjà chiffrées par le serveur ; aucun recalcul de classement.
export function pointDetails(p, match) {
  if (!p || match?.pointsPending || !Number.isFinite(p.pointsEarned)) return null;
  const base = p.pointsEarned,
    bonus = p.bonusPoints || 0,
    multiplier = match.pointsMultiplier || 1;
  let parts = [`Barème : +${base}`];
  if (base === multiplier) parts = [`Bon vainqueur : +${base}`];
  else if (base === 4 * multiplier) parts = [`Bon vainqueur : +${multiplier}`, `Score exact : +${3 * multiplier}`];
  if (bonus) parts.push(`Bonus outsider : +${bonus}`);
  if (multiplier > 1) parts.push(`×${multiplier} déjà inclus`);
  return { total: base + bonus, parts };
}
export function isBigGain(row) {
  if (!Number.isFinite(row.points)) return false;
  const type = String(row.type || '').toLowerCase();
  if (type.includes('podium')) return row.points >= 30;
  if (type.includes('poule')) return [6, 8].includes(row.points);
  return type.includes('match') && row.points >= 4 && row.details?.some((d) => /score exact/i.test(d));
}
