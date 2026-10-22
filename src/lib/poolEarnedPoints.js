// Display only persisted points from the authenticated pool response. Never rescore here.
export function poolEarnedPoints(pool) {
  if (!pool?.isFinal || !Array.isArray(pool.fencers)) return null;
  let total = 0;
  for (const fencer of pool.fencers) {
    if (!fencer.prediction) continue;
    const value = fencer.prediction.pointsEarned;
    if (!Number.isFinite(value)) return null;
    total += value;
  }
  return total;
}
