import { createContext, useContext } from 'react';
export const FencerFollowsContext = createContext(null);
export const useFencerFollows = () => useContext(FencerFollowsContext);

// Seuls les noms rapprochés par le serveur pour l’épreuve courante sont mis en avant.
export const isFollowedFencer = (follows, name) =>
  Boolean(follows?.ready && name && follows.matchNames?.includes(name));
