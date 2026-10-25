export function teamLiveRows(scores, { gender = '', selected = null, now = Date.now() } = {}) {
  return [...scores.values()].filter(
    (row) =>
      !row.finished &&
      Number.isFinite(Date.parse(row.updatedAt)) &&
      now - Date.parse(row.updatedAt) <= 180000 &&
      (!gender || row.gender === gender) &&
      (!selected || selected.has(row.matchId)),
  );
}

const teamKey = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
// The display match can already be reversed to the official piste order.
export function relayNamesForMatch(scores, match, competitionId, now = Date.now()) {
  if (!match || match.isFinished) return null;
  const rows = teamLiveRows(scores, { now }).filter(
    (r) => r.officialMatchId === match.id && r.competitionId === competitionId,
  );
  if (rows.length !== 1) return null;
  const row = rows[0];
  const a = teamKey(match.player1),
    b = teamKey(match.player2);
  if (!a || !b || a === b) return null;
  const forward = teamKey(row.player1) === a && teamKey(row.player2) === b;
  const reverse = teamKey(row.player1) === b && teamKey(row.player2) === a;
  if (!forward && !reverse) return null;
  return reverse
    ? [row.fencer2?.name || null, row.fencer1?.name || null]
    : [row.fencer1?.name || null, row.fencer2?.name || null];
}
