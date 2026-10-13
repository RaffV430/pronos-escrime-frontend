const EMPTY = new Map();
export function scoresForCompetition(snapshot, competitionId, active) {
  return active && competitionId && snapshot.competitionId === competitionId ? snapshot.scores : EMPTY;
}
export function hasActiveLiveScore(scores, matches, competitionId) {
  const ongoing = new Set(matches.filter((m) => m.competitionId === competitionId && !m.isFinished).map((m) => m.id));
  return [...scores.values()].some((s) => s.finished === false && ongoing.has(s.matchId));
}
