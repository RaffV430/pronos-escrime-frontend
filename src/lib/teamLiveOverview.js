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
