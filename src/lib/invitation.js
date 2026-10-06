// Lien d'invitation à un groupe (/rejoindre/<code>) : le code est gardé jusqu'à la connexion ou
// l'inscription, puis le groupe est rejoint automatiquement.
const KEY = 'pronos:invitation';
const CODE = /^[A-F0-9]{24}$/;

export const invitationPath = (code) => `/rejoindre/${code}`;
export const invitationUrl = (code, origin = window.location.origin) => `${origin}${invitationPath(code)}`;

export function invitationFromPath(pathname) {
  const code = /^\/rejoindre\/([A-Za-z0-9]+)\/?$/.exec(pathname || '')?.[1]?.toUpperCase();
  return code && CODE.test(code) ? code : null;
}
export function pendingInvitation() {
  try {
    const code = localStorage.getItem(KEY);
    return code && CODE.test(code) ? code : null;
  } catch {
    return null;
  }
}
export function storeInvitation(code) {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* Sans stockage, le code reste saisissable à la main dans Communauté. */
  }
}
export function clearInvitation() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* rien à nettoyer */
  }
}
// Arrivée par un lien d'invitation : le code est mémorisé et l'adresse redevient celle de l'accueil.
export function captureInvitation() {
  const code = invitationFromPath(location.pathname);
  if (!code) return pendingInvitation();
  storeInvitation(code);
  history.replaceState(null, '', '/');
  return code;
}
