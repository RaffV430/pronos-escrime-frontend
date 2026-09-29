// Détection d'une nouvelle mise en ligne : Vite nomme le script principal d'après son contenu
// (assets/index-<empreinte>.js). Si la page d'accueil publiée en référence un autre, une version plus
// récente est disponible. Aucun rechargement forcé : le joueur choisit le moment.
export const entryScript = (html) => /\/assets\/index-[\w-]+\.js/.exec(String(html || ''))?.[0] || null;

export function currentEntry(doc = document) {
  const src = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).find(entryScript);
  return src ? entryScript(src) : null;
}

export async function newerVersion(current, fetcher = fetch) {
  if (!current) return false;
  const res = await fetcher(`/?version-check=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
  if (!res.ok) return false;
  const published = entryScript(await res.text());
  return Boolean(published && published !== current);
}
