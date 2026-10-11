import { createContext, useContext } from 'react';
export const FencerFollowsContext = createContext(null);
export const useFencerFollows = () => useContext(FencerFollowsContext);

// Seuls les noms rapprochés par le serveur pour l’épreuve courante sont mis en avant.
const canonicalName = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('fr');
export const isFollowedFencer = (follows, name) =>
  Boolean(follows?.ready && name && follows.matchNames?.some(approved => canonicalName(approved) === canonicalName(name)));
