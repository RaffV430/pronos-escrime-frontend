// Gesture classification only: server rules and prediction scoring stay in MatchBoard.
export function swipeSide({ x, y, elapsed, width }) {
  if (Math.abs(x) <= Math.abs(y) * 1.4) return null;
  const distance = Math.min(85, width * 0.23);
  return Math.abs(x) > distance || (Math.abs(x) > 35 && Math.abs(x) / Math.max(elapsed, 1) > 0.48)
    ? x < 0
      ? 1
      : 2
    : null;
}
export function swipeCandidates(matches, { closed, hasPrediction, hasDraft }) {
  return matches.filter(
    (m) =>
      m.player1?.trim() &&
      m.player2?.trim() &&
      !['En attente...', 'Exempt', 'BYE'].includes(m.player1) &&
      !['En attente...', 'Exempt', 'BYE'].includes(m.player2) &&
      !closed(m) &&
      !hasPrediction(m) &&
      !hasDraft(m),
  );
}
