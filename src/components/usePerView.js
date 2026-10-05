import { useEffect, useState } from 'react';

// Nombre de tours affichés côte à côte selon la largeur (2 sur téléphone : un tour et le suivant).
export function usePerView() {
  const query = () =>
    typeof window === 'undefined' || !window.matchMedia
      ? 4
      : window.matchMedia('(max-width: 600px)').matches
        ? 2
        : window.matchMedia('(max-width: 1000px)').matches
          ? 3
          : 4;
  const [n, setN] = useState(query);
  useEffect(() => {
    if (!window.matchMedia) return;
    const lists = ['(max-width: 600px)', '(max-width: 1000px)'].map((q) => window.matchMedia(q));
    const update = () => setN(query());
    lists.forEach((l) => l.addEventListener?.('change', update));
    return () => lists.forEach((l) => l.removeEventListener?.('change', update));
  }, []);
  return n;
}
