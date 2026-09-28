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
    try {
      storage?.removeItem('token');
    } catch {
      /* Stockage indisponible : la session reste en mémoire. */
    }
    target?.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return Promise.reject(error);
}

// Âge d'un jeton en secondes (lecture de la date d'émission, sans vérification).
export function tokenAgeSeconds(token, now = Date.now()) {
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number.isFinite(payload.iat) ? Math.floor(now / 1000) - payload.iat : null;
  } catch {
    return null;
  }
}

// Session glissante : un jeton de plus d'un jour est renouvelé pour 30 jours.
export const shouldRefresh = (token, now = Date.now()) => (tokenAgeSeconds(token, now) ?? 0) > 24 * 3600;
