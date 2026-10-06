import { createContext, useContext } from 'react';

// Onglet Résultats consulté sans compte (/resultats) : données publiques, aucun pronostic personnel.
export const PublicMode = createContext(false);
export const usePublicMode = () => useContext(PublicMode);
