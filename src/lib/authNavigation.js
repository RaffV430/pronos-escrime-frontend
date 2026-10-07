// Les paramètres des anciens liens (épreuve, match, réinitialisation) sont conservés.
export const isAuthPath = (pathname) => /^\/(connexion|inscription)\/?$/.test(pathname);
export const authPath = (register = false, search = '') =>
  `${register ? '/inscription' : '/connexion'}${search}`;
export function legacyLoginPath(pathname, search, hash) {
  return !isAuthPath(pathname) && hash === '#connexion' ? authPath(false, search) : null;
}
