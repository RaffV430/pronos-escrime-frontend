// Site officiel d'un lien collé par l'administrateur (FencingTimeLive ou engarde-service).
export function sourceOf(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'engarde-service.com' && /^\/(tournament|competition)\//.test(url.pathname)) return 'engarde';
  if (host === 'fencingtimelive.com') return 'ftl';
  return null;
}
