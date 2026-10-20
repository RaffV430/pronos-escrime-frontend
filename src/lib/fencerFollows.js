import { createContext, useContext } from 'react';
export const FencerFollowsContext = createContext(null);
export const useFencerFollows = () => useContext(FencerFollowsContext);

// Seuls les noms rapprochés par le serveur pour l’épreuve courante sont mis en avant.
const canonicalName = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('fr');
// Homonymes d'une même épreuve : le tireur suivi est reconnu par son nom et son club (clubNames), jamais par le nom seul.
const sameClubName = (x, name, club) => canonicalName(x.name) === canonicalName(name) && canonicalName(x.club) === canonicalName(club);
export const isFollowedFencer = (follows, name, club = null) =>
  Boolean(follows?.ready && name && (follows.matchNames?.some(approved => canonicalName(approved) === canonicalName(name)) ||
    (club && follows.clubNames?.some(x => sameClubName(x, name, club)))));
// Club d'un engagé suivi qui a un homonyme dans l'épreuve (null sinon).
export const followedClub = (follows, entry) =>
  (entry && entry.country && follows?.clubNames?.find(x => sameClubName(x, entry.name, entry.country))?.club) || null;
// Matchs d'un engagé suivi : par le nom (sans homonyme) ou par le nom et le club (homonyme).
export const followedMatches = (follows, entry, matches = []) => {
  const club = followedClub(follows, entry);
  if (!follows?.matchNames?.includes(entry?.name) && !club) return [];
  const mine = (name, k) => canonicalName(name) === canonicalName(entry.name) && (!club || canonicalName(k) === canonicalName(club));
  return matches.filter(m => mine(m.player1, m.club1) || mine(m.player2, m.club2));
};
