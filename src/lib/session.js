// Jeton expiré ou révoqué : on le retire et on prévient l'application, qui
// ramène le joueur à l'écran de connexion. Les erreurs de connexion elles-mêmes
// (mauvais mot de passe) et les refus d'accès (403) ne sont pas concernés.
export const SESSION_EXPIRED_EVENT = 'pronos:session-expired';

export function isExpiredSession(error) {
  const url = error?.config?.url || '';
  const sentToken = Boolean(error?.config?.headers?.Authorization);
  return error?.response?.status === 401 && sentToken && !/^\/auth\/(login|register)$/.test(url);
}

export function handleAuthError(error, { storage = globalThis.localStorage, target = globalThis.window } = {}) {
  if (isExpiredSession(error)) {
    try { storage?.removeItem('token'); } catch { /* Stockage indisponible : la session reste en mémoire. */ }
    target?.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return Promise.reject(error);
}
