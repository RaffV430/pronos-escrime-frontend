// Follow server checks without making the browser trigger official imports.
export function nextResultCheck(data, now, reduced) {
  const minimum = reduced ? 60000 : 5000;
  const fallback = reduced ? 60000 : 30000;
  const next = Date.parse(data?.nextAt);
  if (data?.state === 'RUNNING') return minimum;
  return Number.isFinite(next) ? Math.max(minimum, Math.min(fallback, next - now + 1000)) : fallback;
}
export function resultRevision(data) {
  return data?.checkedAt || null;
}
