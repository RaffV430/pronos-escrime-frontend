// Remove only acknowledged records, preserving unrelated recoverable and active drafts.
export function settleDraftEntries({ stored, active, recoverable }, ids) {
  const acknowledged = new Set(ids.map(String));
  const remaining = (value) => {
    const entries = Object.entries(value || {}).filter(([id]) => !acknowledged.has(id));
    return entries.length ? Object.fromEntries(entries) : null;
  };
  return {
    value: remaining({ ...stored, ...active }),
    recoverable: remaining(recoverable),
  };
}
