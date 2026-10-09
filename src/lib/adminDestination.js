export function adminDestination(search = '') {
  const q = new URLSearchParams(search);
  const panel = q.get('panel');
  if (!['clubs', 'sync'].includes(panel)) return null;
  const id = Number(q.get('request'));
  return { panel, requestId: Number.isSafeInteger(id) && id > 0 ? id : null };
}
export function loginReturn(search = '') {
  const value = new URLSearchParams(search).get('returnTo');
  if (!value || !/^\/admin(?:\?|$)/.test(value) || value.includes('#') || value.includes('\\')) return null;
  return value;
}
export function adminLoginPath(pathname, search = '') {
  return pathname.split('/')[1] === 'admin' ? `/connexion?returnTo=${encodeURIComponent('/admin' + search)}` : null;
}
export async function updateBadge(count, target = globalThis.navigator) {
  try {
    if (count > 0) await target?.setAppBadge?.(count);
    else await target?.clearAppBadge?.();
  } catch {
    /* Unsupported or denied by the device. */
  }
}
