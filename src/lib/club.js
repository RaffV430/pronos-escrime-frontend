import { createContext, useContext } from 'react';

// « SAVIN Rafael », « Savin  Rafaël » → même tireur (casse, accents et espaces ignorés).
export const normalizeName = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export function clubValue(data) {
  const names = new Set((data?.fencers || []).map(normalizeName));
  return {
    name: data?.name || '',
    fencers: data?.fencers || [],
    league: data?.league || null,
    hasFencers: names.size > 0,
    isClubFencer: (name) => names.has(normalizeName(name)),
  };
}

// Club de l'application (tireurs mis en avant, club permanent), partagé par toutes les pages.
export const ClubContext = createContext(clubValue(null));
export const useClub = () => useContext(ClubContext);
