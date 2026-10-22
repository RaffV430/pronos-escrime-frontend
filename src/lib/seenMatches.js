// Optional device preference only; never writes predictions or their drafts.
const memory = new Map();
const keyFor = (userId, competitionId) => `pronos:seen-matches:${userId}:${competitionId}`;
const validIds = (value) => Array.isArray(value) && value.every((id) => Number.isSafeInteger(id) && id > 0);
export function readSeenMatches(userId, competitionId, storage) {
  const key = keyFor(userId, competitionId);
  try {
    const ids = JSON.parse((storage || localStorage).getItem(key) || 'null');
    if (validIds(ids)) return [...new Set([...ids, ...(memory.get(key) || [])])];
  } catch {
    /* Storage may be blocked; navigation remains usable. */
  }
  return memory.has(key) ? [...memory.get(key)] : null;
}
export function rememberSeenMatches(userId, competitionId, matches, storage) {
  const key = keyFor(userId, competitionId);
  const ids = [
    ...new Set([
      ...(readSeenMatches(userId, competitionId, storage) || []),
      ...matches.map((m) => m.id).filter((id) => Number.isSafeInteger(id) && id > 0),
    ]),
  ];
  memory.set(key, ids);
  try {
    (storage || localStorage).setItem(key, JSON.stringify(ids));
  } catch {
    /* Optional preference. */
  }
  return ids;
}
export function unseenMatchCount(event, userId, currentEventId, storage) {
  if (Number(event.id) === Number(currentEventId)) return 0;
  const seen = readSeenMatches(userId, event.id, storage);
  if (seen === null) return 0;
  const known = new Set(seen);
  return new Set(
    (event.matches || [])
      .filter((m) => !known.has(m.id) && !m.predictions?.some((p) => p.userId === userId))
      .map((m) => m.id),
  ).size;
}

export function rememberLoadedMatches(
  { userId, competitionId, matches, ready, stale = false, error = '', visible = true },
  storage,
) {
  if (
    !visible ||
    !ready ||
    stale ||
    error ||
    !userId ||
    !competitionId ||
    !Array.isArray(matches) ||
    matches.some((m) => Number(m.competitionId) !== Number(competitionId))
  )
    return null;
  return rememberSeenMatches(userId, competitionId, matches, storage);
}
