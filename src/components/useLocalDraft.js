import { useState, useEffect, useCallback } from 'react';
export const draftKey = (user, event, type) => `pronos:draft:v1:${user}:${event}:${type}`;
export function readDraft(key) {
  try {
    const item = JSON.parse(localStorage.getItem(key) || 'null');
    return item &&
      item.version === 1 &&
      Number.isFinite(item.at) &&
      item.value &&
      typeof item.value === 'object' &&
      !Array.isArray(item.value) &&
      Date.now() - item.at < 30 * 86400000
      ? item.value
      : null;
  } catch {
    return null;
  }
}
export default function useLocalDraft(key) {
  const [recoverable, setRecoverable] = useState(() => readDraft(key));
  const [warning, setWarning] = useState('');
  const persist = useCallback(
    (value) => {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify({ version: 1, at: Date.now(), value }));
      } catch {
        setWarning('La sauvegarde sur cet appareil est indisponible. Gardez cette page ouverte avant d’enregistrer.');
      }
    },
    [key],
  );
  const discard = useCallback(() => {
    persist(null);
    setRecoverable(null);
  }, [persist]);
  useEffect(() => {
    const sync = (e) => {
      if (e.key === key) setRecoverable(readDraft(key));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  return { recoverable, persist, discard, warning, restored: () => setRecoverable(null) };
}
