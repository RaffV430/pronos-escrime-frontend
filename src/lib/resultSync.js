// Follow server checks without making the browser trigger official imports.
export const RESULT_REFRESH_MS = 5000;
export const REDUCED_RESULT_REFRESH_MS = 60000;
export function resultRefreshInterval(reduced) {
  return reduced ? REDUCED_RESULT_REFRESH_MS : RESULT_REFRESH_MS;
}
export function nextResultCheck(_data, _now, reduced) {
  return resultRefreshInterval(reduced);
}
export function resultRevision(data) {
  return data?.checkedAt || null;
}
