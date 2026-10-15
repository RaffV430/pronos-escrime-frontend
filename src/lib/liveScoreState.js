const EMPTY = new Map();
export function scoresForCompetition(snapshot, competitionId, active) {
  return active && competitionId && snapshot.competitionId === competitionId ? snapshot.scores : EMPTY;
}
export function hasActiveLiveScore(scores, matches, competitionId) {
  const ongoing = new Set(matches.filter((m) => m.competitionId === competitionId && !m.isFinished).map((m) => m.id));
  return [...scores.values()].some((s) => s.finished === false && ongoing.has(s.matchId));
}

// Reconnexion = instantané complet ; les autres messages ne contiennent que les changements.
export function applyLiveMessage(previous, data) {
  if (Array.isArray(data)) return new Map(data.map((row) => [row.matchId, row]));
  if (data?.version !== 1 || !Array.isArray(data.matches) || !Array.isArray(data.removed))
    throw new Error('Flux live invalide');
  const next = data.reset ? new Map() : new Map(previous);
  for (const id of data.removed) next.delete(id);
  for (const patch of data.matches) {
    const { historyFrom, historyAppend, ...fields } = patch;
    const before = next.get(patch.matchId) || {};
    const row = { ...before, ...fields };
    if (historyAppend) {
      if ((before.history || []).length !== historyFrom) throw new Error('Historique live désynchronisé');
      row.history = [...(before.history || []), ...historyAppend];
    }
    next.set(patch.matchId, row);
  }
  return next;
}
