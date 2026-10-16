// Sélection d’affichage uniquement : la fermeture est fournie par les règles existantes du tableau.
export const tableauPhase = (match) => (match.round?.startsWith('J1:') ? 'preliminary' : 'main');
export function defaultTableauPhase(matches, isClosed) {
  const preliminary = matches.filter((m) => tableauPhase(m) === 'preliminary');
  if (!preliminary.length) return 'main';
  if (preliminary.some((m) => !isClosed(m))) return 'preliminary';
  if (matches.some((m) => tableauPhase(m) === 'main' && !isClosed(m))) return 'main';
  // Sans rencontre ouverte, garder le J1 en cours ; une fois terminé, montrer le principal, même à venir.
  return preliminary.every((m) => m.isFinished) ? 'main' : 'preliminary';
}
