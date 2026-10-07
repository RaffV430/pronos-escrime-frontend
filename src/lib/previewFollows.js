// Préférences de suivi propres à cet appareil : aucune écriture sur le serveur.
export function readPreviewFollows(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || '[]');
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.filter((athlete) => {
      if (
        !athlete ||
        typeof athlete.name !== 'string' ||
        !athlete.name.trim() ||
        !['string', 'number'].includes(typeof athlete.id) ||
        seen.has(athlete.id)
      )
        return false;
      seen.add(athlete.id);
      return true;
    });
  } catch {
    return [];
  }
}
