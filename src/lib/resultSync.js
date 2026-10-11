// Follow server checks without making the browser trigger official imports.
// Les écrans se rafraîchissent dès qu'un nouveau contrôle serveur est détecté (veilleur partagé par
// épreuve, ci-dessous) ; leur relecture périodique n'est qu'un filet de sécurité.
export const RESULT_REFRESH_MS = 30000;
export const REDUCED_RESULT_REFRESH_MS = 60000;
export const FRESHNESS_EVENT = 'pronos:freshness';
const FAST = 5000,
  IDLE = 30000,
  DONE = 120000;
export function resultRefreshInterval(reduced) {
  return reduced ? REDUCED_RESULT_REFRESH_MS : RESULT_REFRESH_MS;
}
// Rythme du veilleur : 5 s pendant un contrôle, calé sur le prochain contrôle prévu sinon,
// 2 min pour une épreuve terminée, 1 min en mode données réduites.
export function nextResultCheck(data, now, reduced) {
  if (data?.state === 'COMPLETE') return Math.max(DONE, reduced ? REDUCED_RESULT_REFRESH_MS : 0);
  if (reduced) return REDUCED_RESULT_REFRESH_MS;
  if (data?.state === 'RUNNING') return FAST;
  const next = Date.parse(data?.nextAt);
  return Number.isFinite(next) ? Math.max(FAST, Math.min(IDLE, next - now + 1000)) : IDLE;
}
export function resultRevision(data) {
  return data?.checkedAt || null;
}
